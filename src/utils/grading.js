// questions: [{id, answer_key, ...}], answers: {question_id: "A"}
export function gradeAttempt(questions, answers) {
  let correct = 0
  let wrong = 0

  questions.forEach((q) => {
    const chosen = answers[q.id]
    if (!chosen) {
      wrong += 1
    } else if (chosen === q.answer_key) {
      correct += 1
    } else {
      wrong += 1
    }
  })

  const total = questions.length
  const score = total > 0 ? Math.round((correct / total) * 100 * 100) / 100 : 0

  return { correct, wrong, total, score }
}
