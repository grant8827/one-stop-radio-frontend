# Verification Answer Tracking Implementation

## Overview
The system now tracks right and wrong answers in the `all_renters` table when users answer verification questions in the "Renter History Found" pop-up.

## Database Fields
The following fields in the `all_renters` table are used:
- `answered_right` - Count of correct answers
- `answered_wrong` - Count of wrong answers

## Features Implemented

### 1. **Automatic Answer Recording**
When users submit verification questions, the system automatically:
- Counts correct and wrong answers
- Updates the `all_renters` table with totals
- Logs the activity for debugging

### 2. **Individual Answer Tracking**
You can also record answers one at a time as users answer each question:

**Endpoint:** `POST /api/dashboard/verification/record-answer`

**Request:**
```json
{
  "is_correct": true,
  "question_id": 0,
  "answer_data": {
    "question_index": 0,
    "timestamp": "2026-01-02T10:30:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answered_right": 5,
    "answered_wrong": 2,
    "total_questions": 7,
    "accuracy_percentage": 71.43,
    "rental_code": "RC123456"
  }
}
```

### 3. **Statistics Endpoint**
Get comprehensive statistics for the authenticated user:

**Endpoint:** `GET /api/dashboard/verification/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "answered_right": 5,
    "answered_wrong": 2,
    "total_questions": 7,
    "accuracy_percentage": 71.43,
    "rental_code": "RC123456",
    "verification_level": "Verified",
    "user_data": {
      "full_name": "John Doe",
      "email": "john@example.com",
      "data_source": "User Registration"
    }
  }
}
```

### 4. **Reset Statistics**
Reset verification statistics for a user:

**Endpoint:** `POST /api/dashboard/verification/reset-stats`

**Response:**
```json
{
  "success": true,
  "message": "Verification statistics reset successfully.",
  "data": {
    "answered_right": 0,
    "answered_wrong": 0,
    "total_questions": 0,
    "accuracy_percentage": 0,
    "rental_code": "RC123456"
  }
}
```

## Verification Levels
Based on accuracy and total questions answered:
- **Not Started** - No questions answered yet
- **In Progress** - 1-4 questions answered
- **Partially Verified** - 5+ questions, <60% accuracy
- **Verified** - 5+ questions, 60-79% accuracy
- **Highly Verified** - 5+ questions, 80%+ accuracy

## How It Works

### Backend Flow:

1. **When user submits verification questions:**
   - `submitVerifiedAddresses()` receives the answer string
   - Calls `validateVerificationAnswers()` 
   - Compares submitted answers with cached correct answers
   - Counts correct and wrong answers
   - Updates `all_renters` table using `incrementCorrectAnswers()` and `incrementWrongAnswers()`

2. **For individual answer tracking (optional):**
   - Frontend calls `recordVerificationAnswer()` after each question
   - Updates the database immediately
   - Returns updated statistics

### Frontend Integration Example:

```javascript
// Option 1: Track answers individually as user answers each question
const handleAnswerSelection = async (questionIndex, selectedOptionIndex, correctIndex) => {
  const isCorrect = selectedOptionIndex === correctIndex;
  
  try {
    const response = await fetch('/api/dashboard/verification/record-answer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        is_correct: isCorrect,
        question_id: questionIndex,
        answer_data: {
          question_index: questionIndex,
          selected_option: selectedOptionIndex
        }
      })
    });
    
    const data = await response.json();
    console.log('Answer recorded:', data);
    
  } catch (error) {
    console.error('Failed to record answer:', error);
  }
};

// Option 2: Answers are automatically tracked when submitting all at once
// (Already implemented in validateVerificationAnswers method)
```

## Model Helper Methods (AllRenter.php)

The `AllRenter` model includes these helper methods:

```php
// Increment correct answers count
$renter->incrementCorrectAnswers(1);

// Increment wrong answers count
$renter->incrementWrongAnswers(1);

// Get total questions answered
$total = $renter->getTotalQuestionsAnsweredAttribute();

// Get accuracy percentage
$accuracy = $renter->getAnswerAccuracyAttribute();
```

## Testing

Use the provided test file: `test-verification-answer-tracking.html`

1. Open the file in a browser
2. Login with test credentials
3. Simulate answering questions (correct/wrong)
4. View updated statistics in real-time
5. Test the reset functionality

## API Routes

All routes require authentication via Bearer token:

```php
// Dashboard group (requires auth)
Route::post('/verification/record-answer', [ProfileDashboardController::class, 'recordVerificationAnswer']);
Route::get('/verification/stats', [ProfileDashboardController::class, 'getVerificationStats']);
Route::post('/verification/reset-stats', [ProfileDashboardController::class, 'resetVerificationStats']);
```

## Database Schema

The `all_renters` table should have:
```sql
answered_right INT DEFAULT 0
answered_wrong INT DEFAULT 0
```

## Notes

- Answers are recorded in the `all_renters` table, not the `users` table
- The system matches users by email address
- If no `AllRenter` record exists, one will be created during answer recording
- Accuracy is calculated as: `(answered_right / total_questions) * 100`
- All operations are logged for debugging purposes
