// Fisher-Yates shuffle, tidak mengubah array asli
export function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Mengacak urutan pilihan A-E sekaligus menandai lokasi kunci jawaban yang baru
export function shuffleOptions(question) {
  const letters = ['A', 'B', 'C', 'D', 'E']
  const entries = letters
    .map((l) => ({ letter: l, text: question[`option_${l.toLowerCase()}`] }))
    .filter((e) => e.text && e.text.trim() !== '')

  const shuffled = shuffleArray(entries)

  const options = {}
  let newAnswerKey = question.answer_key
  shuffled.forEach((entry, idx) => {
    const newLetter = letters[idx]
    options[newLetter] = entry.text
    if (entry.letter === question.answer_key) {
      newAnswerKey = newLetter
    }
  })

  return { options, answer_key: newAnswerKey }
}

export function pickRandomQuestions(bank, count) {
  const shuffled = shuffleArray(bank)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}
