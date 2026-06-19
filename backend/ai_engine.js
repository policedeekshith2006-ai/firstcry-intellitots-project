/**
 * AI / Heuristic Analysis Engine for Teacher Observations
 * Parses unstructured notes into structured:
 * - Strengths
 * - Concerns / Focus Areas
 * - Actionable Suggestions for Home
 * - Warm, parent-friendly progress summary
 */

function parseObservationNotes(childName, notes) {
  if (!notes || typeof notes !== 'string') {
    return {
      strengths: 'Not recorded yet.',
      concerns: 'None identified.',
      suggestions: 'Continue standard reading routine.',
      ai_summary: 'No details available.'
    };
  }

  // Split into sentences
  const sentences = notes.split(/(?<=[.!?])\s+/);
  
  const strengthsArr = [];
  const concernsArr = [];
  const suggestionsArr = [];

  // Keywords for classification
  const strengthKeywords = [
    'excellent', 'good', 'mastered', 'easily', 'great', 'strength', 'strong', 
    'loves', 'enthusiasm', 'enjoys', 'recognized', 'spots', 'fluent', 'well', 
    'quick', 'positive', 'confident', 'perfect'
  ];

  const concernKeywords = [
    'struggle', 'difficulty', 'hard', 'needs help', 'needs practice', 'hesitant', 
    'hesitation', 'mixes', 'confuses', 'slow', 'stumbles', 'trouble', 'forget', 
    'forgot', 'focus area', 'review'
  ];

  const suggestionKeywords = [
    'suggest', 'recommend', 'should', 'at home', 'parents', 'please', 
    'encourage', 'work on at home', 'try to'
  ];

  sentences.forEach(sentence => {
    const clean = sentence.trim();
    if (clean.length < 5) return;

    const lower = clean.toLowerCase();
    
    // Check suggestions first since suggestions often mention practice (which is also in concerns)
    const isSuggestion = suggestionKeywords.some(kw => lower.includes(kw));
    const isConcern = concernKeywords.some(kw => lower.includes(kw));
    const isStrength = strengthKeywords.some(kw => lower.includes(kw));

    if (isSuggestion) {
      suggestionsArr.push(clean);
    } else if (isConcern) {
      concernsArr.push(clean);
    } else if (isStrength || (!isConcern && !isSuggestion)) {
      // Default to strength or positive observation
      strengthsArr.push(clean);
    }
  });

  // Clean strings
  const strengths = strengthsArr.length > 0 ? strengthsArr.join(' ') : 'Doing well with general class reading activities.';
  const concerns = concernsArr.length > 0 ? concernsArr.join(' ') : 'No specific concerns observed at this level.';
  const suggestions = suggestionsArr.length > 0 ? suggestionsArr.join(' ') : 'Continue reading bedtime stories together and pointing out letters.';

  // Build a warm parent summary
  let parentSummary = '';
  const firstName = childName || 'Your child';

  // Strength hook
  if (strengthsArr.length > 0) {
    // Take first strength sentence, clean name references to make it flow
    const strengthSentence = strengthsArr[0].replace(new RegExp(firstName, 'gi'), 'they');
    parentSummary += `🌟 ${firstName} is making wonderful progress! We observed that ${strengthSentence.charAt(0).toLowerCase() + strengthSentence.slice(1)} `;
  } else {
    parentSummary += `🌟 ${firstName} is participating happily in classroom reading activities. `;
  }

  // Concern focus hook
  if (concernsArr.length > 0) {
    const concernSentence = concernsArr[0].replace(new RegExp(firstName, 'gi'), 'they');
    parentSummary += `Right now, we are giving extra care to help them where ${concernSentence.charAt(0).toLowerCase() + concernSentence.slice(1)} `;
  } else {
    parentSummary += `They are holding steady at their current milestones. `;
  }

  // Suggestion hook
  if (suggestionsArr.length > 0) {
    const suggestionSentence = suggestionsArr[0].replace(new RegExp(firstName, 'gi'), 'they');
    parentSummary += `To support this at home, we suggest: ${suggestionSentence.charAt(0).toLowerCase() + suggestionSentence.slice(1)}`;
  } else {
    parentSummary += `At home, keep up the daily reading time as it builds great confidence!`;
  }

  return {
    strengths,
    concerns,
    suggestions,
    ai_summary: parentSummary
  };
}

module.exports = {
  parseObservationNotes
};
