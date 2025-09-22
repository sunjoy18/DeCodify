# Migration from Replicate to Google Gemini

This document outlines the changes made to replace Replicate with Google's Gemini API.

## Summary of Changes

### 1. Dependencies Updated
- **Removed**: `replicate` dependency
- **Added**: `@google/generative-ai` package for Gemini API access
- **Kept**: `@langchain/community` for HuggingFace embeddings
- **Kept**: `@huggingface/inference` for embedding functionality

### 2. Core Changes in `routes/chat.js`

#### Custom Google Gemini LLM Wrapper
- Created `GeminiLLM` class that extends LangChain's `BaseLLM`
- Implements both standard and streaming chat functionality using Google's Generative AI SDK
- Compatible with existing LangChain chains and retrievers

#### Embedding Service Migration
- Replaced OpenAI embeddings with HuggingFace embeddings
- Uses `sentence-transformers/all-MiniLM-L6-v2` model
- Fallback to demo API key if HuggingFace API key not provided

#### Function Renamed
- `initializeOpenAI()` → `initializeModels()`
- Updated all references throughout the codebase

### 3. Environment Variables

#### Before (Replicate)
```bash
REPLICATE_API_TOKEN=your_replicate_api_token
```

#### After (Google + HuggingFace)
```bash
GOOGLE_API_KEY=your_google_api_key
HUGGINGFACE_API_KEY=your_huggingface_api_key  # Optional
```

## Setup Instructions

### 1. Get Google API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign up or log in with your Google account
3. Create a new API key
4. Enable the Generative AI API if not already enabled
5. Set it as `GOOGLE_API_KEY` in your environment

### 2. Get HuggingFace API Key (Optional)
1. Visit [huggingface.co](https://huggingface.co)
2. Sign up or log in
3. Go to Settings → Access Tokens
4. Create a new token
5. Set it as `HUGGINGFACE_API_KEY` in your environment

**Note**: If you don't provide a HuggingFace API key, the system will use a demo key with limited usage.

### 3. Update Environment File
Create or update your `.env` file:
```bash
GOOGLE_API_KEY=your_google_api_key_here
HUGGINGFACE_API_KEY=hf_your_token_here
```

### 4. Restart the Server
```bash
npm run dev
```

## Technical Details

### Google Gemini Model
- **Model**: `gemini-1.5-pro`
- **Streaming**: Supported via `generateContentStream()`
- **Parameters**: temperature, maxOutputTokens, system prompts
- **API**: Google's Generative AI SDK with streaming support

### HuggingFace Embeddings
- **Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Performance**: Suitable for semantic search and retrieval
- **Cost**: Free tier available, very affordable

### Backwards Compatibility
- All existing API endpoints remain the same
- Chat functionality works identically
- Vector store and retrieval logic unchanged
- Frontend requires no modifications

## Performance Considerations

### Advantages
- **Cost**: Google Gemini offers competitive pricing with generous free tier
- **Performance**: Gemini 1.5 Pro offers excellent performance and large context windows
- **Reliability**: Google's infrastructure provides high availability

### Potential Considerations
- **Rate Limits**: Check Google's API quotas and rate limits
- **Regional Availability**: Ensure Gemini API is available in your region
- **Context Limits**: Monitor token usage with large codebases

## Troubleshooting

### Common Issues

1. **"GOOGLE_API_KEY environment variable is not set"**
   - Ensure your `.env` file contains the API key
   - Restart the server after adding the key

2. **Embedding errors**
   - Check HuggingFace API key is valid
   - Verify internet connectivity
   - Try using demo key temporarily

3. **Stream not working**
   - Ensure Google API key has proper permissions
   - Check browser console for SSE errors
   - Verify Gemini API quotas are not exceeded

### Testing the Migration

Run a simple test to verify everything works:
```bash
# Test the server starts without errors
npm run dev

# Test a simple chat request
curl -X POST http://localhost:5000/api/chat/project/test \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

## Future Enhancements

1. **Model Switching**: Add ability to switch between different Gemini models (Pro, Flash, etc.)
2. **Google Embeddings**: Consider using Google's embedding models when available
3. **Cost Tracking**: Monitor API usage and costs with Google Cloud Console
4. **Caching**: Implement response caching for common queries

---

**Migration completed successfully!** The system now uses Google's Gemini 1.5 Pro instead of Replicate's GPT-4.1.
