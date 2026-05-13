const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Candidate = require('../models/candidate.model');
const CandidateGroup = require('../models/candidateGroup.model');

/**
 * @desc Candidate Service — Business Logic Layer
 * All database interactions for the Candidate feature live here.
 * Controllers are thin — they only call these service functions.
 *
 * Feature: F5 - Candidate Management
 * Author: ainaseyim@gmail.com
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate a random 6-digit access PIN for candidates.
 * Returns the plain PIN (send to candidate once) and the hashed version (store in DB).
 */
const generateAccessPin = async () => {
    const plain = Math.floor(100000 + Math.random() * 900000).toString();
    const rounds = parseInt(process.env.BCRYPT_ROUNDS, 10) || 12;
    const hashed = await bcrypt.hash(plain, rounds);
    return { plain, hashed };
};

/**
 * Parse a CSV buffer into an array of candidate row objects.
 * Expected CSV headers: name, email, idNumber (optional), phone (optional), profilePictureUrl (optional)
 * Returns { rows: [], errors: [] }
 */
const parseCsvBuffer = (buffer) => {
    const lines = buffer.toString('utf8').split('\n').filter(Boolean);

    if (lines.length < 2) {
        return { rows: [], errors: ['CSV file is empty or missing data rows'] };
    }

    // const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const headerMap = {
        'name': 'name',
        'email': 'email',
        'idnumber': 'idNumber', // Converts 'idnumber' back to camelCase!
        'phone': 'phone',
        'profilepictureurl': 'profilePhotoUrl'
    };

    // 2. Map the headers using the dictionary
    const headers = lines[0].split(',').map(h => {
        const cleanHeader = h.trim().toLowerCase();
        return headerMap[cleanHeader] || cleanHeader; // Fallback to the original if not in map
    });

    const requiredHeaders = ['name', 'email'];
    const missing = requiredHeaders.filter(h => !headers.includes(h));

    if (missing.length > 0) {
        return {
            rows: [],
            errors: [`CSV is missing required columns: ${missing.join(', ')}`],
        };
    }

    const rows = [];
    const errors = [];

    lines.slice(1).forEach((line, index) => {
        const rowNum = index + 2;
        const values = line.split(',').map(v => v.trim());
        const row = {};

        headers.forEach((header, i) => {
            row[header] = values[i] || null;
        });

        if (!row.name || row.name.length < 2) {
            errors.push({ row: rowNum, field: 'name', message: 'Name is missing or too short' });
            return;
        }
        if (!row.email || !/^\S+@\S+\.\S+$/.test(row.email)) {
            errors.push({ row: rowNum, field: 'email', message: 'Email is missing or invalid' });
            return;
        }

        rows.push(row);
    });

    return { rows, errors };
};


// ─── CANDIDATE AUTH ───────────────────────────────────────────────────────────

/**
 * Candidate PIN Login.
 * Candidates log in using their idNumber + accessPin (not email/password like admins).
 * Returns a JWT token scoped to this candidate and their tenant.
 *
 * @param {String} tenantId  - from tenantMiddleware (ensures they log into the right org)
 * @param {String} idNumber  - candidate's unique ID / matriculation number
 * @param {String} accessPin - the 6-digit plain PIN
 */
const candidateLogin = async (tenantId, idNumber, accessPin) => {
    // Find candidate within this tenant by idNumber — select accessPin explicitly
    // (it's marked select:false in the model so it never comes back by default)
    const candidate = await Candidate.findOne({ idNumber, tenantId }).select('+accessPin');

    if (!candidate) {
        throw new Error('Invalid ID number or access PIN');
    }

    if (candidate.status === 'suspended') {
        throw new Error('Your account has been suspended. Please contact your administrator.');
    }

    if (candidate.status === 'inactive') {
        throw new Error('Your account is inactive. Please contact your administrator.');
    }

    // Compare plain PIN against the hashed PIN stored in the DB
    const isPinValid = await bcrypt.compare(accessPin, candidate.accessPin);
    if (!isPinValid) {
        throw new Error('Invalid ID number or access PIN');
    }

    // Generate a JWT for the candidate — same structure as admin tokens
    // so the same authMiddleware can decode it on protected routes
    const token = jwt.sign(
        {
            id: candidate._id,
            role: 'candidate',      // fixed role — candidates are always 'candidate'
            tenantId: candidate.tenantId.toString(),
            candidateId: candidate._id.toString(),
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Return candidate without sensitive fields
    const safeCandidate = candidate.toObject();
    delete safeCandidate.accessPin;
    delete safeCandidate.password;

    return { candidate: safeCandidate, token };
};


// ─── CANDIDATE CRUD ───────────────────────────────────────────────────────────

/**
 * Register a single candidate within a tenant.
 * @param {Object} data       - { name, email, phone, idNumber, profilePictureUrl, password, groupIds }
 * @param {String} tenantId   - from req.tenantId (set by tenantMiddleware)
 * @param {String} createdBy  - admin user _id from req.user._id
 * @returns { candidate, plainPin } — plainPin must be sent to candidate immediately, NOT stored plain
 */
const createCandidate = async (data, tenantId, createdBy) => {
    const { name, email, phone, idNumber, profilePictureUrl, password, groupIds } = data;

    const { plain: plainPin, hashed: hashedPin } = await generateAccessPin();

    const candidate = new Candidate({
        tenantId,
        name,
        email,
        phone: phone || null,
        idNumber: idNumber || null,
        profilePictureUrl: profilePictureUrl || null,
        password: password || null,
        accessPin: hashedPin,
        groupIds: groupIds || [],
        status: 'active',
        createdBy: /^[a-f\d]{24}$/i.test(String(createdBy)) ? createdBy : null,
    });

    await candidate.save();

    // If groupIds were provided, add this candidate to those groups too
    if (groupIds && groupIds.length > 0) {
        await CandidateGroup.updateMany(
            { _id: { $in: groupIds }, tenantId },
            { $addToSet: { candidateIds: candidate._id } }
        );
    }

    return { candidate, plainPin };
};

/**
 * Get all candidates for a tenant with optional filters and pagination.
 * This endpoint is what F4 (Exam Setup) and F6 (Exam Session) will call.
 * @param {String} tenantId
 * @param {Object} filters - { status, groupId, search, page, limit }
 */
const getAllCandidates = async (tenantId, { status, groupId, search, page = 1, limit = 20 }) => {
    const query = { tenantId };

    if (status) query.status = status;
    if (groupId) query.groupIds = groupId;
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { idNumber: { $regex: search, $options: 'i' } },
        ];
    }

    const skip = (page - 1) * limit;

    const [candidates, total] = await Promise.all([
        Candidate.find(query)
            .select('-password -accessPin')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),
        Candidate.countDocuments(query),
    ]);

    return {
        candidates,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get a single candidate by ID — always scoped to the tenant.
 * Returns null if not found or if the candidate belongs to a different tenant.
 */
const getCandidateById = async (candidateId, tenantId) => {
    const candidate = await Candidate.findOne({ _id: candidateId, tenantId })
        .select('-password -accessPin')
        .lean();
    return candidate;
};

/**
 * Update a candidate's profile fields.
 * Sensitive fields are stripped before update so they can never be changed via this endpoint.
 */
const updateCandidate = async (candidateId, tenantId, updates) => {
    delete updates.tenantId;
    delete updates.accessPin;
    delete updates.password;
    delete updates.createdBy;
    delete updates.status;

    const candidate = await Candidate.findOneAndUpdate(
        { _id: candidateId, tenantId },
        { $set: updates },
        { new: true, runValidators: true }
    ).select('-password -accessPin').lean();

    return candidate;
};

/**
 * Update a candidate's status only (active / inactive / suspended).
 */
const updateCandidateStatus = async (candidateId, tenantId, status) => {
    const candidate = await Candidate.findOneAndUpdate(
        { _id: candidateId, tenantId },
        { $set: { status } },
        { new: true }
    ).select('-password -accessPin').lean();

    return candidate;
};

/**
 * Hard-delete a candidate and clean up their groupId references.
 */
const deleteCandidate = async (candidateId, tenantId) => {
    await CandidateGroup.updateMany(
        { tenantId },
        { $pull: { candidateIds: new mongoose.Types.ObjectId(candidateId) } }
    );

    const result = await Candidate.findOneAndDelete({ _id: candidateId, tenantId });
    return result;
};

/**
 * Bulk import candidates from a parsed CSV buffer.
 * @param {Buffer} buffer
 * @param {String} tenantId
 * @param {String} createdBy
 * @returns { created, failed, parseErrors }
 */
const bulkImportCandidates = async (buffer, tenantId, createdBy) => {
    const { rows, errors: parseErrors } = parseCsvBuffer(buffer);

    if (rows.length === 0) {
        return { created: [], failed: [], parseErrors };
    }

    const created = [];
    const failed = [];

    for (const [index, row] of rows.entries()) {
        try {
            const { candidate, plainPin } = await createCandidate(row, tenantId, createdBy);
            created.push({
                row: index + 2,
                email: row.email,
                candidateId: candidate._id,
                plainPin,
            });
        } catch (err) {
            const isDuplicate = err.code === 11000;
            failed.push({
                row: index + 2,
                email: row.email,
                message: isDuplicate
                    ? 'Candidate already exists in this organisation'
                    : err.message,
            });
        }
    }

    return { created, failed, parseErrors };
};


// ─── CANDIDATE GROUP CRUD ─────────────────────────────────────────────────────

const createGroup = async (data, tenantId, createdBy) => {
    const { name, description, candidateIds } = data;

    const group = new CandidateGroup({
        tenantId,
        name,
        description: description || null,
        candidateIds: candidateIds || [],
        createdBy: /^[a-f\d]{24}$/i.test(String(createdBy)) ? createdBy : null,
    });

    await group.save();

    if (candidateIds && candidateIds.length > 0) {
        await Candidate.updateMany(
            { _id: { $in: candidateIds }, tenantId },
            { $addToSet: { groupIds: group._id } }
        );
    }

    return group;
};

const getAllGroups = async (tenantId, { search, page = 1, limit = 20 }) => {
    const query = { tenantId };

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [groups, total] = await Promise.all([
        CandidateGroup.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(),
        CandidateGroup.countDocuments(query),
    ]);

    return {
        groups,
        pagination: {
            total,
            page: Number(page),
            limit: Number(limit),
            pages: Math.ceil(total / limit),
        },
    };
};

const getGroupById = async (groupId, tenantId) => {
    const group = await CandidateGroup.findOne({ _id: groupId, tenantId })
        .populate('candidateIds', 'name email idNumber status')
        .lean();
    return group;
};

const updateGroup = async (groupId, tenantId, updates) => {
    delete updates.tenantId;
    delete updates.createdBy;
    delete updates.candidateIds;

    const group = await CandidateGroup.findOneAndUpdate(
        { _id: groupId, tenantId },
        { $set: updates },
        { new: true, runValidators: true }
    ).lean();

    return group;
};

const deleteGroup = async (groupId, tenantId) => {
    await Candidate.updateMany(
        { tenantId },
        { $pull: { groupIds: new mongoose.Types.ObjectId(groupId) } }
    );

    const result = await CandidateGroup.findOneAndDelete({ _id: groupId, tenantId });
    return result;
};

const addCandidatesToGroup = async (groupId, tenantId, candidateIds) => {
    const validCandidates = await Candidate.find(
        { _id: { $in: candidateIds }, tenantId },
        '_id'
    ).lean();

    const validIds = validCandidates.map(c => c._id);

    if (validIds.length === 0) {
        throw new Error('None of the provided candidate IDs belong to your organisation');
    }

    const group = await CandidateGroup.findOneAndUpdate(
        { _id: groupId, tenantId },
        { $addToSet: { candidateIds: { $each: validIds } } },
        { new: true }
    ).lean();

    if (!group) return null;

    await Candidate.updateMany(
        { _id: { $in: validIds }, tenantId },
        { $addToSet: { groupIds: group._id } }
    );

    return group;
};

const removeCandidatesFromGroup = async (groupId, tenantId, candidateIds) => {
    const objectIds = candidateIds.map(id => new mongoose.Types.ObjectId(id));

    const group = await CandidateGroup.findOneAndUpdate(
        { _id: groupId, tenantId },
        { $pull: { candidateIds: { $in: objectIds } } },
        { new: true }
    ).lean();

    if (!group) return null;

    await Candidate.updateMany(
        { _id: { $in: objectIds }, tenantId },
        { $pull: { groupIds: new mongoose.Types.ObjectId(groupId) } }
    );

    return group;
};


module.exports = {
    // Auth
    candidateLogin,
    // Candidates
    createCandidate,
    getAllCandidates,
    getCandidateById,
    updateCandidate,
    updateCandidateStatus,
    deleteCandidate,
    bulkImportCandidates,
    // Groups
    createGroup,
    getAllGroups,
    getGroupById,
    updateGroup,
    deleteGroup,
    addCandidatesToGroup,
    removeCandidatesFromGroup,
};
