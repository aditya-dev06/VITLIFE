import React, { useState } from 'react';

const QUESTIONS = [
  {
    id: 1,
    question: "What is the primary difference between L1 (Lasso) and L2 (Ridge) regularization?",
    options: [
      "L1 adds absolute weights and can drive coefficients to exactly zero (sparsity); L2 adds squared weights.",
      "L2 adds absolute weights and can drive coefficients to exactly zero; L1 adds squared weights.",
      "L1 is used for classification; L2 is used only for linear regression.",
      "There is no mathematical difference, only performance variation."
    ],
    answer: 0,
    explanation: "L1 regularization (Lasso) adds a penalty equal to the sum of the absolute values of the weights, which encourages sparsity (making some weights exactly 0). L2 regularization (Ridge) penalizes the sum of the squared weights, which shrinks coefficients but doesn't make them exactly zero."
  },
  {
    id: 2,
    question: "Which numerical method is commonly used to find the roots of non-linear equations and offers quadratic convergence?",
    options: [
      "Bisection Method",
      "Secant Method",
      "Newton-Raphson Method",
      "Runge-Kutta Method"
    ],
    answer: 2,
    explanation: "The Newton-Raphson method uses derivative values to iteratively approximate roots. Under standard conditions, it converges quadratically, making it much faster than the linear convergence of Bisection."
  },
  {
    id: 3,
    question: "In statistics, what does the Central Limit Theorem (CLT) guarantee?",
    options: [
      "The population data will always become normally distributed if we collect enough samples.",
      "The distribution of the sample mean will approach a normal distribution as the sample size increases, regardless of the population's shape.",
      "All variables are normally distributed in nature.",
      "The variance of the sample mean is equal to the population variance."
    ],
    answer: 1,
    explanation: "The CLT states that for a sufficiently large sample size, the sampling distribution of the mean will be approximately normal, even if the underlying population distribution is skewed or non-normal."
  },
  {
    id: 4,
    question: "Which SQL clause is used to filter groups or filter records *after* aggregate functions have been applied?",
    options: [
      "WHERE",
      "HAVING",
      "GROUP BY",
      "SELECT DISTINCT"
    ],
    answer: 1,
    explanation: "The HAVING clause was added to SQL because the WHERE keyword could not be used with aggregate functions. WHERE filters rows before aggregation; HAVING filters groups after aggregation."
  },
  {
    id: 5,
    question: "What problem does the gradient clipping technique solve during the training of Deep Recurrent Neural Networks?",
    options: [
      "Vanishing Gradients",
      "Exploding Gradients",
      "Model Overfitting",
      "Slow Learning Rate"
    ],
    answer: 1,
    explanation: "Gradient clipping limits the magnitude of gradients during backpropagation. If the gradient exceeds a threshold, it is scaled down, preventing the numerical instability of 'exploding gradients' typical in RNNs."
  },
  {
    id: 6,
    question: "What does the Receiver Operating Characteristic (ROC) curve plot?",
    options: [
      "Precision vs Recall at various threshold levels",
      "True Positive Rate (Sensitivity) vs False Positive Rate (1 - Specificity) at various thresholds",
      "Bias vs Variance across different model complexities",
      "Training Loss vs Validation Loss over epochs"
    ],
    answer: 1,
    explanation: "The ROC curve plots the True Positive Rate against the False Positive Rate for all classification thresholds, giving a complete picture of a classifier's performance."
  }
];

const PracticeArena = ({ onAddXp }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const currentQuestion = QUESTIONS[currentIdx];

  const handleOptionSelect = (optionIdx) => {
    if (isAnswered) return;
    setSelectedOpt(optionIdx);
  };

  const handleSubmit = () => {
    if (selectedOpt === null || isAnswered) return;
    
    setIsAnswered(true);
    if (selectedOpt === currentQuestion.answer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedOpt(null);
    setIsAnswered(false);
    
    if (currentIdx < QUESTIONS.length - 1) {
      setCurrentIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
      // Reward XP (e.g. 50 XP per correct answer)
      const earnedXp = score * 30;
      if (onAddXp) {
        onAddXp(earnedXp);
      }
    }
  };

  const handleReset = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div>
      <div className="section-header">
        <h1 className="section-title">Practice Arena</h1>
        <p className="section-subtitle">
          Solve computational, mathematical, and machine learning quizzes to earn XP and upgrade your stats.
        </p>
      </div>

      <div className="arena-grid">
        {!quizFinished ? (
          <div className="glass-panel quiz-card">
            <div className="quiz-progress">
              <span>Question {currentIdx + 1} of {QUESTIONS.length}</span>
              <span>Score: {score}</span>
            </div>
            
            <div className="quiz-bar-bg">
              <div 
                className="quiz-bar-fill" 
                style={{ width: `${((currentIdx + (isAnswered ? 1 : 0)) / QUESTIONS.length) * 100}%` }}
              ></div>
            </div>

            <h3 className="quiz-question">{currentQuestion.question}</h3>

            <div className="options-list">
              {currentQuestion.options.map((option, idx) => {
                let btnClass = '';
                if (isAnswered) {
                  if (idx === currentQuestion.answer) btnClass = 'correct';
                  else if (idx === selectedOpt) btnClass = 'incorrect';
                } else if (idx === selectedOpt) {
                  btnClass = 'selected';
                }
                
                return (
                  <button 
                    key={idx} 
                    className={`option-btn ${btnClass}`}
                    onClick={() => handleOptionSelect(idx)}
                    disabled={isAnswered}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {/* Answer Feedback / Explanation */}
            {isAnswered && (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '1.25rem', 
                  marginBottom: '2rem', 
                  background: selectedOpt === currentQuestion.answer ? 'rgba(34,197,94,0.05)' : 'rgba(239,68,68,0.05)',
                  borderColor: selectedOpt === currentQuestion.answer ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'
                }}
              >
                <div style={{ fontWeight: 700, color: selectedOpt === currentQuestion.answer ? '#4ade80' : '#f87171', marginBottom: '0.5rem' }}>
                  {selectedOpt === currentQuestion.answer ? '✓ Correct Answer!' : '✗ Incorrect'}
                </div>
                <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', lineHeight: 1.5 }}>
                  {currentQuestion.explanation}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              {!isAnswered ? (
                <button 
                  className="btn-primary" 
                  onClick={handleSubmit} 
                  disabled={selectedOpt === null}
                  style={{ opacity: selectedOpt === null ? 0.6 : 1 }}
                >
                  Submit Answer
                </button>
              ) : (
                <button className="btn-primary" onClick={handleNext}>
                  {currentIdx === QUESTIONS.length - 1 ? 'Finish Quiz' : 'Next Question →'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-panel quiz-card" style={{ textAlign: 'center', padding: '3.5rem 2rem' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🏆</div>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Quiz Completed!</h2>
            <p style={{ color: 'hsl(var(--text-secondary))', marginBottom: '2rem' }}>
              You answered {score} out of {QUESTIONS.length} questions correctly.
            </p>

            <div className="glass-card" style={{ padding: '1.5rem', maxWidth: '300px', margin: '0 auto 2.5rem', borderStyle: 'dashed' }}>
              <div style={{ fontSize: '0.85rem', color: 'hsl(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reward Claimed
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#eab308', margin: '0.5rem 0' }}>
                +{score * 30} XP
              </div>
              <div style={{ fontSize: '0.75rem', color: 'hsl(var(--text-secondary))' }}>
                XP synced to your local profile dashboard
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={handleReset}>
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PracticeArena;
