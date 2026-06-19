const aiEngine = require('../backend/ai_engine');

function runTest(testName, input, expectedResultChecker) {
  console.log(`Running Test: ${testName}`);
  try {
    const result = aiEngine.parseObservationNotes('Aria', input);
    const passed = expectedResultChecker(result);
    if (passed) {
      console.log('✅ Passed\n');
    } else {
      console.error('❌ Failed! Output:', JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } catch (err) {
    console.error(`💥 Crash in Test: ${testName}`, err);
    process.exit(1);
  }
}

// Test 1: Mixed notes with clear keywords
runTest(
  'Normal observation parsing with strengths, concerns, and suggestions',
  'Aria is doing excellent with uppercase letters. She struggles with blend sounds like "ch". I suggest practice at home.',
  (res) => {
    return (
      res.strengths.includes('excellent') &&
      res.concerns.includes('struggles') &&
      res.suggestions.includes('practice') &&
      res.ai_summary.includes('Aria')
    );
  }
);

// Test 2: Only positive observation
runTest(
  'Observation with only positive details',
  'Aria is highly confident and easily reads CVC words. She did great on all sight word games.',
  (res) => {
    return (
      res.strengths.includes('confident') &&
      res.concerns.toLowerCase().includes('no specific concerns') &&
      res.ai_summary.includes('CVC words')
    );
  }
);

// Test 3: Only concerns and suggestions
runTest(
  'Observation detailing only concerns and recommendations',
  'Aria mixes up lowercase d and b. Suggest playing letter-matching card games.',
  (res) => {
    return (
      res.concerns.includes('mixes up') &&
      res.suggestions.includes('matching') &&
      res.strengths.toLowerCase().includes('doing well')
    );
  }
);

console.log('🎉 All AI Logic unit tests completed successfully!');
