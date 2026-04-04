***How to Run the Project***

# Install Dependencies
#### Ignore this if you have already installed dependencies in the root directory for the frontend.

npm install

cd functions

npm install

# Run backend (API)
### ***Run once***
```
npm install -g firebase-tools

firebase login

firebase init functions <project_id>

cd functions

npm install firebase-admin firebase-functions
```
***Start emulator***
```
firebase emulators:start
```
# Run the Project
```
cd cashiverse
npm run dev
```

This will start both the React development server and the Firebase Functions emulator concurrently. You can access the React app at http://localhost:3000 and the Firebase Functions from the url from the emulator.

## Authentication
All endpoints require authentication via a Bearer token in the Authorization header:
Get the bearer token by adding this in firebase.js and loging in with a user in the frontend. The token will be printed in the console.
```
auth.onAuthStateChanged(async (user) => {
  if (user) {
    const token = await user.getIdToken();
    console.log("TOKEN:", token);
  } else {
    console.log("No user logged in");
  }
});
```

## Endpoints
**Note all endpoints will be available at the base URL provided by the Firebase emulator, typically `http://localhost:5001/cashiverse/us-central1/` when running locally.**
### 1. Create Profile
**Endpoint:** `/createProfile`  
**Method:** POST  
**Description:** Creates a new user profile for authenticated users.

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "role": "employee" | "manager",
  "employeeId": "string"
}
```

**Response (201):**
```json
{
  "message": "Profile created successfully",
  "uid": "string"
}
```

**Error Responses:**
- 400: Missing required fields or invalid role
- 401: Unauthorized
- 405: Method not allowed

### 2. Clock In
**Endpoint:** `/clockIn`  
**Method:** POST  
**Description:** Allows employees to clock in for a specific date.

**Request Body:**
```json
{
  "dateWorked": "YYYY-MM-DD"
}
```

**Response (201):**
```json
{
  "message": "Successfully Clocked In",
  "entryId": "string"
}
```

**Error Responses:**
- 400: Missing dateWorked
- 403: Only employees can clock in
- 404: Profile not found
- 401: Unauthorized
- 405: Method not allowed

### 3. Get Time Entries
**Endpoint:** `/gettimeEntries`  
**Method:** GET  
**Description:** Retrieves all time entries for the authenticated user.

**Response (200):**
```json
{
  "count": number,
  "entries": [
    {
      "id": "string",
      "userId": "string",
      "employeeId": "string",
      "username": "string",
      "dateWorked": "string",
      "clockIn": "ISO8601 string or null",
      "clockOut": "ISO8601 string or null",
      "hoursWorked": number or null,
      "entryLabel": "string",
      "createdAt": "ISO8601 string"
    }
  ]
}
```

**Error Responses:**
- 401: Unauthorized
- 405: Method not allowed

### 4. Update User Name
**Endpoint:** `/userNameUpdate`  
**Method:** PUT  
**Description:** Updates the first and/or last name of the authenticated user.

**Request Body:**
```json
{
  "firstName": "string" (optional),
  "lastName": "string" (optional)
}
```

**Response (200):**
```json
{
  "message": "User name successfully updated"
}
```

**Error Responses:**
- 400: Missing firstName or lastName
- 401: Unauthorized
- 405: Method not allowed

### 5. Delete Time Entry
**Endpoint:** `/deleteTimeEntry`  
**Method:** DELETE  
**Description:** Deletes a specific time entry owned by the authenticated user.

**Request Body:**
```json
{
  "entryId": "string"
}
```

**Response (200):**
```json
{
  "message": "Time entry deleted",
  "entryId": "string"
}
```

**Error Responses:**
- 400: Missing entryId
- 403: Can only delete own entries
- 404: Time entry not found
- 401: Unauthorized
- 405: Method not allowed

## Testing with Postman
1. Obtain a Firebase ID token as described in the main README
2. Set the Authorization header: `Bearer <token>`
3. Make requests to the appropriate endpoints
4. Responses can also be verified in the firebase https://console.firebase.google.com/ under firestore logs

