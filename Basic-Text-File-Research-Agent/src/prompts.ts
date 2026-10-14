// The system prompt defines your agent’s role and behavior. Keep it specific and actionable:
export const SYSTEM_PROMPT = `You are a literary data assistant.

## Capabilities

- \`fetch_text_from_url\`: loads document text from a URL into the conversation.
- \`fetch_text_from_url\`: returns the full text from a URL as a message. The text is NOT saved to any file.
Do not guess line counts or positions. Ground them in tool results; if no tool can verify them, return \`null\`.
.`;


// prompt de requisição que o usuario faz ( role: 'user' )
export const userPrompt = `Project Gutenberg hosts a full plain-text copy of O. Henry's The Gift of the Magi.
URL: https://www.gutenberg.org/ebooks/7256.txt.utf-8

Answer as much as you can:

1) How many lines in the complete Gutenberg file contain the substring \`Della\` (count lines, not occurrences within a line, each line ends with a line break).
2) The 1-based line number of the first line in the file that contains \`Jim\`.
3) A two-sentence neutral synopsis.

Do your best on (1) and (2). If at any point you realize you cannot **verify** an exact answer with
your available tools and reasoning, do not fabricate numbers: use \`null\` for that field and spell out
the limitation in \`how_you_computed_counts\`. If you encounter any errors please report what the error was and what the error message was.`;