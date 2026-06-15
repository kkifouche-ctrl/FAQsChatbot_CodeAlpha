# FAQ Chatbot

A full-stack FAQ chatbot web application that helps users find the most relevant answers to common questions using NLP-based similarity matching. The project includes a Python backend for intelligent FAQ search and a React frontend for a clean chat interface with category filtering, chat history, and interactive question browsing.

## Overview

This chatbot is designed to answer FAQ-style questions about cloud hosting services. It uses text preprocessing, TF-IDF vectorization, and cosine similarity to compare user questions with a built-in FAQ database and return the closest match with a confidence score.

The project is split into two parts:
- **Backend**: Python + Flask API for question matching and FAQ serving
- **Frontend**: React + Vite interface for chatting with the bot

## Features

- Natural language question matching using TF-IDF and cosine similarity
- Confidence scoring for matched answers
- Fallback support when no match is found
- Category-based FAQ filtering
- Searchable “All Questions” modal
- Chat history saved locally in the browser
- Suggested questions for quick interaction
- Dark/light theme support
- Responsive and interactive user interface
- REST API endpoints for FAQs, categories, and chatbot queries

## Technologies Used

### Backend
- **Python**
- **Flask**
- **Flask-CORS**
- **NLTK** for tokenization, stopword removal, and stemming
- **scikit-learn** for TF-IDF vectorization and cosine similarity
- Standard Python libraries such as `json`, `math`, and `re`

### Frontend
- **JavaScript**
- **React**
- **Vite**
- **Bootstrap**
- **HTML**
- **CSS**

### Browser Storage
- **localStorage** for saving theme preference and chat history

## How It Works

1. The user enters a question in the chatbot interface.
2. The frontend sends or processes the question and compares it against available FAQs.
3. The backend preprocesses text by:
   - converting to lowercase
   - removing punctuation
   - removing stopwords
   - applying stemming when available
4. TF-IDF vectors are built for the FAQ questions.
5. Cosine similarity is used to find the best matching FAQ.
6. The chatbot returns the most relevant answer and a confidence score.

If no suitable match is found, the bot shows a friendly fallback message and can suggest related questions.

## Project Structure

```text
FAQ-Chatbot_codeAlpha/
├── backend/
│   └── faqChatbot.py
└── frontend/
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── FAQChatbot.jsx
        ├── AllQuestionsModal.jsx
        ├── HistoryPanel.jsx
        ├── App.css
        └── index.css
