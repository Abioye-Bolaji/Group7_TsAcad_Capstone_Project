# Notification System (F10) — Integration Guide

This document explains how to use the centralized notification service. If you are working on **Candidates (F5)**, **Exams (F4)**, or **Results (F8)**, use this utility to handle all user alerts. Do not write your own email or notification logic.

---

## How to use it in your feature

Follow these three steps to integrate notifications into your service layer.

### Step 1: Import the service

At the top of your service file, import the notification logic.

```javascript
/* * Import the notification service to access the sendNotification tool. 
 * This avoids duplicate logic in the codebase.
 */
const notificationService = require('./notification.service');

```

### Step 2: Call the function

Inside your logic (for example, after a student is successfully created), call the tool like this:

```javascript
/*
 * This function handles both saving the message to the database for the 
 * in-app feed and sending a physical email via SMTP.
 */
await notificationService.sendNotification({
    // The ID of the school. Always retrieve this from req.tenantId to ensure isolation.
    tenantId: tenantId, 
    
    // The _id of the user receiving the message.
    recipientId: newUser._id, 
    
    // The recipient email address. This is required if the type is 'email' or 'both'.
    recipientEmail: newUser.email, 
    
    // The subject line of the notification.
    subject: "Welcome to the CBT Platform", 
    
    // The main body of the notification.
    message: "Your account has been created. You can now log in.", 
    
    // Options:
    // 'in-app' : Saves to database feed only.
    // 'email'  : Sends an email only.
    // 'both'   : Saves to feed and sends an email.
    type: "both" 
});

```

### Step 3: Why we do it this way

* **Consistency**: Every user receives the same style of message regardless of which feature is triggering it.
* **Speed**: Developers only need to write one line of code to handle complex background tasks like SMTP delivery.
* **Security**: By strictly using the `tenantId` from the system, we guarantee that messages are never sent to the wrong school's users.

---

## Technical Notes for Teammates

* **Isolation**: The service filters all "Get" requests by `tenantId` and `recipientId` to prevent data leaks.
* **Performance**: Email sending is handled in the background. The API will not wait for the email to finish before responding to the user.
* **Requirements**: Ensure the `recipientId` you pass exists in the database, or the notification will fail validation.