/**
 * Verification Answer Tracking - Frontend Integration Example
 * 
 * This file shows how to integrate answer tracking into your React/Vue/JS frontend
 */

// =============================================================================
// OPTION 1: Track Each Answer Individually (Real-time tracking)
// =============================================================================

class VerificationQuestionTracker {
  constructor(authToken) {
    this.authToken = authToken;
    this.apiBase = 'https://rentalhist.com/api';
  }

  /**
   * Record a single answer
   * @param {number} questionId - Index of the question (0-based)
   * @param {boolean} isCorrect - Whether the answer was correct
   * @param {object} additionalData - Optional additional data
   */
  async recordAnswer(questionId, isCorrect, additionalData = {}) {
    try {
      const response = await fetch(`${this.apiBase}/dashboard/verification/record-answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          is_correct: isCorrect,
          question_id: questionId,
          answer_data: {
            question_index: questionId,
            timestamp: new Date().toISOString(),
            ...additionalData
          }
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to record answer');
      }

      return data.data; // Returns: { answered_right, answered_wrong, total_questions, accuracy_percentage, rental_code }
    } catch (error) {
      console.error('Error recording answer:', error);
      throw error;
    }
  }

  /**
   * Get current verification statistics
   */
  async getStats() {
    try {
      const response = await fetch(`${this.apiBase}/dashboard/verification/stats`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch stats');
      }

      return data.data;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  }

  /**
   * Reset all statistics
   */
  async resetStats() {
    try {
      const response = await fetch(`${this.apiBase}/dashboard/verification/reset-stats`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset stats');
      }

      return data.data;
    } catch (error) {
      console.error('Error resetting stats:', error);
      throw error;
    }
  }
}

// =============================================================================
// REACT COMPONENT EXAMPLE
// =============================================================================

// Example React Component
function VerificationQuestionsComponent() {
  const [questions, setQuestions] = React.useState([]);
  const [currentQuestion, setCurrentQuestion] = React.useState(0);
  const [stats, setStats] = React.useState(null);
  const [correctAnswers, setCorrectAnswers] = React.useState([]);
  const authToken = localStorage.getItem('authToken');
  const tracker = new VerificationQuestionTracker(authToken);

  // Load questions on mount
  React.useEffect(() => {
    loadQuestions();
    loadStats();
  }, []);

  const loadQuestions = async () => {
    // Your existing code to load verification questions
    // This should also cache the correct answer indices
  };

  const loadStats = async () => {
    try {
      const statsData = await tracker.getStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleAnswerSelect = async (questionIndex, selectedOptionIndex) => {
    const isCorrect = selectedOptionIndex === correctAnswers[questionIndex];
    
    try {
      // Record the answer
      const updatedStats = await tracker.recordAnswer(questionIndex, isCorrect, {
        question_text: questions[questionIndex].question,
        selected_option: selectedOptionIndex
      });

      // Update stats display
      setStats(updatedStats);

      // Show feedback to user
      if (isCorrect) {
        showNotification('✅ Correct!', 'success');
      } else {
        showNotification('❌ Incorrect', 'error');
      }

      // Move to next question
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        // All questions answered
        handleCompletedVerification();
      }
    } catch (error) {
      console.error('Error recording answer:', error);
      // Continue anyway - don't block user experience
    }
  };

  const handleCompletedVerification = () => {
    // Show completion message with stats
    if (stats) {
      const accuracy = stats.accuracy_percentage;
      let message = '';
      
      if (accuracy >= 80) {
        message = `🎉 Excellent! You got ${stats.answered_right} out of ${stats.total_questions} correct (${accuracy}%)`;
      } else if (accuracy >= 60) {
        message = `👍 Good job! You got ${stats.answered_right} out of ${stats.total_questions} correct (${accuracy}%)`;
      } else {
        message = `You got ${stats.answered_right} out of ${stats.total_questions} correct (${accuracy}%). Please contact your property manager for a rental code.`;
      }
      
      showCompletionDialog(message);
    }
  };

  return (
    <div className="verification-container">
      {stats && (
        <div className="stats-banner">
          <span>Correct: {stats.answered_right}</span>
          <span>Wrong: {stats.answered_wrong}</span>
          <span>Accuracy: {stats.accuracy_percentage}%</span>
        </div>
      )}
      
      {/* Your question display UI here */}
    </div>
  );
}

// =============================================================================
// OPTION 2: Automatic Tracking on Submit (Batch tracking)
// =============================================================================

/**
 * This option uses the existing submitVerifiedAddresses endpoint
 * which automatically tracks answers when the answer_string is submitted
 * 
 * No additional frontend code needed - tracking happens automatically!
 */

async function submitVerificationAnswers(answerString, authToken) {
  const response = await fetch('https://rentalhist.com/api/dashboard/submit-verified-addresses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      answer_string: answerString // e.g., "01020003"
    })
  });

  const data = await response.json();
  
  if (data.success) {
    // Answers were automatically tracked in the database!
    // The all_renters table was updated with correct/wrong counts
    console.log('Verification complete and answers tracked!');
  }
  
  return data;
}

// =============================================================================
// VUE COMPONENT EXAMPLE
// =============================================================================

const VerificationComponent = {
  data() {
    return {
      questions: [],
      currentQuestion: 0,
      stats: null,
      tracker: null
    };
  },
  
  created() {
    const authToken = this.$store.state.authToken;
    this.tracker = new VerificationQuestionTracker(authToken);
    this.loadStats();
  },
  
  methods: {
    async loadStats() {
      try {
        this.stats = await this.tracker.getStats();
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    },
    
    async recordAnswer(questionIndex, isCorrect) {
      try {
        this.stats = await this.tracker.recordAnswer(questionIndex, isCorrect);
        
        // Emit event for parent component
        this.$emit('answer-recorded', {
          questionIndex,
          isCorrect,
          stats: this.stats
        });
      } catch (error) {
        console.error('Error recording answer:', error);
      }
    }
  },
  
  template: `
    <div class="verification-questions">
      <div v-if="stats" class="stats-display">
        <div>Accuracy: {{ stats.accuracy_percentage }}%</div>
        <div>Level: {{ stats.verification_level }}</div>
      </div>
      <!-- Your questions UI here -->
    </div>
  `
};

// =============================================================================
// VANILLA JAVASCRIPT EXAMPLE
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  const authToken = localStorage.getItem('authToken');
  const tracker = new VerificationQuestionTracker(authToken);
  
  // Get current stats on page load
  const stats = await tracker.getStats();
  displayStats(stats);
  
  // Handle answer button clicks
  document.querySelectorAll('.answer-button').forEach(button => {
    button.addEventListener('click', async (e) => {
      const questionId = parseInt(e.target.dataset.questionId);
      const isCorrect = e.target.dataset.correct === 'true';
      
      // Record the answer
      const updatedStats = await tracker.recordAnswer(questionId, isCorrect);
      
      // Update UI
      displayStats(updatedStats);
      
      // Show feedback
      showFeedback(isCorrect);
      
      // Move to next question
      showNextQuestion();
    });
  });
});

function displayStats(stats) {
  document.getElementById('correct-count').textContent = stats.answered_right;
  document.getElementById('wrong-count').textContent = stats.answered_wrong;
  document.getElementById('accuracy').textContent = stats.accuracy_percentage + '%';
  document.getElementById('verification-level').textContent = stats.verification_level;
}

// =============================================================================
// USAGE SUMMARY
// =============================================================================

/**
 * CHOOSE YOUR APPROACH:
 * 
 * 1. REAL-TIME TRACKING (Recommended for better UX):
 *    - Use recordAnswer() after each question
 *    - Provides instant feedback
 *    - Updates stats in real-time
 *    - Better user engagement
 * 
 * 2. BATCH TRACKING (Simplest):
 *    - Just submit answer_string at the end
 *    - Answers automatically tracked
 *    - Less API calls
 *    - No changes needed to existing code
 * 
 * 3. HYBRID APPROACH:
 *    - Track individual answers for UX
 *    - Still submit answer_string for verification
 *    - Best of both worlds
 */
