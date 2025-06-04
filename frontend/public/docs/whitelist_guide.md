# How to Whitelist User Emails

This guide explains how to add email addresses to the application's whitelist, which allows new users to create accounts.

## Prerequisites

- You must have an admin account in the CIL CBT Application
- You need to be logged in with your admin account

## Step-by-Step Guide

1. **Access User Management**
   - Log in to the application
   - Click on "User Management" in the sidebar menu

2. **Add a New Whitelisted Email**
   - In the User Management screen, click the "Whitelist Email" button at the top right
   - A dialog box will appear
   - Enter the email address you want to whitelist
   - Click "Whitelist" to confirm

3. **Verify Success**
   - You should see a success message
   - The dialog will close automatically
   - The newly whitelisted email can now be used to register a new account

## Troubleshooting

If you encounter the "Failed to whitelist email" error:

1. **Check the email format**
   - Ensure the email address is in a valid format (e.g., user@example.com)

2. **Verify your admin rights**
   - Confirm you are logged in with an admin account
   - Try logging out and logging back in

3. **Check for duplicate entries**
   - The email might already be whitelisted

4. **Server connectivity**
   - Ensure the application server is running properly

## Notes

- Users with whitelisted emails still need to complete the registration process
- Whitelisted emails are case-sensitive
- You cannot remove emails from the whitelist through the UI (requires direct database access)
- There is currently no limit to how many email addresses can be whitelisted
