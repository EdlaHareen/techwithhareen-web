import { useState } from "react"
import type { ClarifierQuestion } from "../lib/api"

interface Props {
  questions: ClarifierQuestion[]
  onSubmit: (answers: Record<string, string>) => void
  onSkip: () => void
}

/**
 * ClarifierStep — renders dynamic clarifying questions for educational topics.
 * Each question shows pill-selector options matching the style of the News/Educational toggle.
 * "Generate" enabled only when all questions have a selection.
 * "Skip →" uses all question.default values and calls onSubmit immediately.
 */
export default function ClarifierStep({ questions, onSubmit, onSkip }: Props) {
  // Initialize answers with defaults
  const defaultAnswers = Object.fromEntries(questions.map((q) => [q.id, q.default]))
  const [answers, setAnswers] = useState<Record<string, string>>(defaultAnswers)

  function select(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function handleGenerate() {
    onSubmit(answers)
  }

  function handleSkip() {
    onSkip()
  }

  return (
    <div className="mb-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-800">Customize your carousel</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Answer these questions to get exactly the content you want.
        </p>
      </div>

      <div className="space-y-5">
        {questions.map((q) => (
          <div key={q.id}>
            <p className="text-sm font-medium text-gray-700 mb-2">{q.text}</p>
            <div className="flex flex-wrap gap-2">
              {q.options.map((opt) => {
                const isSelected = answers[q.id] === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => select(q.id, opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      isSelected
                        ? "bg-violet-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:border-violet-400 hover:text-violet-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          onClick={handleSkip}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Skip → use defaults
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Generate
        </button>
      </div>
    </div>
  )
}

