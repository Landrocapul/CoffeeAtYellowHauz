<?php
declare(strict_types=1);

/** Native PHP implementation of the staff guide chatbot. */
final class StaffChatbot
{
    private const EMPTY_REPLY = 'Ask me about taking orders, payments, tables, tickets, stock, reports, or account settings.';
    private const FALLBACK_REPLY = 'I am not sure yet. Try asking things like: how do I take an order, how do I mark a ticket complete, how do I restock an item, or how do I view sales?';

    private string $intentsFile;
    private string $learnedFile;

    public function __construct(?string $directory = null)
    {
        $directory = $directory ?? __DIR__;
        $this->intentsFile = $directory . DIRECTORY_SEPARATOR . 'intents.json';
        $this->learnedFile = $directory . DIRECTORY_SEPARATOR . 'learned_intents.json';
    }

    public function answer(string $message): array
    {
        $tokens = $this->normalize($message);
        if ($tokens === []) {
            return ['reply' => self::EMPTY_REPLY, 'matched_intent' => 'empty', 'confidence' => 0];
        }

        $bestScore = 0;
        $bestIntent = null;
        foreach ($this->loadIntents() as $intent) {
            $score = $this->scoreIntent($tokens, $intent);
            if ($score > $bestScore) {
                $bestScore = $score;
                $bestIntent = $intent;
            }
        }

        if ($bestScore <= 0 || $bestIntent === null) {
            return ['reply' => self::FALLBACK_REPLY, 'matched_intent' => 'fallback', 'confidence' => 0, 'needs_training' => true];
        }

        return [
            'reply' => (string)($bestIntent['response'] ?? ''),
            'matched_intent' => $bestIntent['tag'] ?? 'unknown',
            'confidence' => min(100, $bestScore * 10),
            'needs_training' => $bestScore < 6,
            'source' => $bestIntent['source'] ?? 'built_in',
        ];
    }

    public function learn(string $question, string $response, string $learnedBy = 'staff'): array
    {
        $question = trim($question);
        $response = trim($response);
        if (strlen($question) < 3) {
            throw new InvalidArgumentException('Question is too short.');
        }
        if (strlen($response) < 8) {
            throw new InvalidArgumentException('Answer is too short.');
        }

        $normalizedQuestion = implode(' ', $this->normalize($question));
        $replacement = [
            'tag' => 'learned_' . trim((string)preg_replace('/[^a-z0-9_]/', '_', substr($normalizedQuestion, 0, 40)), '_'),
            'patterns' => [$question],
            'keywords' => $this->makeKeywords($question),
            'response' => $response,
            'source' => 'learned',
            'learned_by' => $learnedBy,
            'updated_at' => gmdate('c'),
        ];

        $learned = $this->readIntents($this->learnedFile);
        foreach ($learned as $index => $intent) {
            foreach (($intent['patterns'] ?? []) as $pattern) {
                if ($normalizedQuestion === implode(' ', $this->normalize((string)$pattern))) {
                    $learned[$index] = $replacement;
                    $this->saveLearnedIntents($learned);
                    return ['learned' => true, 'updated' => true, 'intent' => $replacement];
                }
            }
        }

        array_unshift($learned, $replacement);
        $this->saveLearnedIntents($learned);
        return ['learned' => true, 'updated' => false, 'intent' => $replacement];
    }

    private function loadIntents(): array
    {
        return array_merge($this->readIntents($this->learnedFile), $this->readIntents($this->intentsFile));
    }

    private function readIntents(string $path): array
    {
        if (!is_file($path)) {
            return [];
        }
        $payload = json_decode((string)file_get_contents($path), true);
        return is_array($payload) && is_array($payload['intents'] ?? null) ? $payload['intents'] : [];
    }

    private function saveLearnedIntents(array $intents): void
    {
        $json = json_encode(['intents' => $intents], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR) . PHP_EOL;
        $tempFile = $this->learnedFile . '.tmp';
        if (file_put_contents($tempFile, $json, LOCK_EX) === false || !rename($tempFile, $this->learnedFile)) {
            throw new RuntimeException('Could not save the chatbot lesson.');
        }
    }

    private function scoreIntent(array $tokens, array $intent): int
    {
        $keywords = array_flip($intent['keywords'] ?? []);
        $weight = ($intent['source'] ?? '') === 'learned' ? 2 : 1;
        $score = 0;
        foreach ($tokens as $token) {
            if (isset($keywords[$token])) {
                $score += 3 * $weight;
            }
        }

        $query = implode(' ', $tokens);
        foreach (($intent['patterns'] ?? []) as $pattern) {
            $patternTokens = $this->normalize((string)$pattern);
            $normalizedPattern = implode(' ', $patternTokens);
            if ($query === $normalizedPattern) {
                $score += 15 * $weight;
            } elseif ($patternTokens !== [] && $this->containsAll($tokens, $patternTokens)) {
                $score += 5 * $weight;
            } elseif ($normalizedPattern !== '' && str_contains($query, $normalizedPattern)) {
                $score += 4 * $weight;
            }
        }
        return $score;
    }

    private function normalize(string $text): array
    {
        $text = strtolower($text);
        $text = preg_replace('/[^a-z0-9\s]/', ' ', $text) ?? '';
        return preg_split('/\s+/', trim($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];
    }

    private function containsAll(array $tokens, array $patternTokens): bool
    {
        foreach ($patternTokens as $token) {
            if (!in_array($token, $tokens, true)) {
                return false;
            }
        }
        return true;
    }

    private function makeKeywords(string $question): array
    {
        $stopWords = array_flip(['a', 'an', 'and', 'are', 'can', 'do', 'does', 'for', 'how', 'i', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'what', 'when', 'where', 'with', 'you']);
        $keywords = [];
        foreach ($this->normalize($question) as $token) {
            if (strlen($token) > 2 && !isset($stopWords[$token])) {
                $keywords[$token] = true;
            }
        }
        $keywords = array_keys($keywords);
        sort($keywords);
        return $keywords;
    }
}
