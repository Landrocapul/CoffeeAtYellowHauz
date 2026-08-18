# Staff Guide Chatbot

This PHP chatbot is called by `api.php?action=staff_chatbot`. It runs directly in PHP, so no Python installation or server environment variable is required.

## Run Locally

The `StaffChatbot` class in `chatbot.php` returns a staff guidance reply, matched intent, and confidence score.

## Learning

The staff widget can teach the bot new answers when it is unsure. Lessons are saved in `learned_intents.json` and loaded before the built-in intents, so a taught answer can be used immediately.

Lessons are saved by the staff widget through the PHP API.
