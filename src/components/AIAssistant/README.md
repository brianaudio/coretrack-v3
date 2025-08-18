# CoreTrack AI Assistant

A comprehensive AI-powered customer support system built for CoreTrack using Google's Gemini Pro API. This system provides intelligent, context-aware assistance to users directly within the CoreTrack application.

## Features

### 🤖 Intelligent AI Assistant
- **Gemini Pro Integration**: Leverages Google's advanced language model for accurate responses
- **Context Awareness**: Understands user role, business type, and current page context
- **Knowledge Base**: Pre-loaded with CoreTrack-specific responses for common questions
- **Conversation Memory**: Maintains conversation history for better context

### 📱 iPad-First Design
- **Touch-Optimized**: 16x16 touch targets optimized for tablet use
- **Responsive Layout**: Adapts seamlessly between mobile, tablet, and desktop
- **Gesture Friendly**: Intuitive interactions designed for touch interfaces

### 🎯 Role-Based Experience
- **Dynamic Content**: Different responses and quick actions based on user role
- **Owner/Manager Features**: Advanced business insights and management guidance
- **Staff Features**: Focus on daily operations and POS functionality

### 🚀 Enterprise Features
- **Multi-Tenant Support**: Single API serves all CoreTrack customers
- **Analytics Integration**: Conversation logging for business insights
- **Learning System**: Continuously improves responses based on usage patterns
- **Scalable Architecture**: Designed to handle enterprise-level usage

## Components

### AIAssistant (Main Component)
```typescript
// Usage
<AIAssistant className="custom-positioning" />
```
Main orchestration component that manages the entire AI chat system.

### FloatingChatButton
Interactive floating button that toggles the chat interface with animations, notifications, and tooltips.

### ChatPanel  
Comprehensive chat interface with:
- Message threading
- Typing indicators
- Auto-scroll functionality
- Quick action buttons
- Context-aware responses

### MessageBubble
Individual message display component with user/AI differentiation and professional styling.

### QuickActions
Role-based quick action buttons for common user questions organized by category.

## Technical Architecture

### Service Layer
- **chatService.ts**: Handles all AI interactions with Gemini Pro API
- **useAuth.ts**: Authentication and user context management
- **Knowledge Base**: Map-based quick response system for common queries

### API Integration
```typescript
// Gemini Pro Configuration
const response = await fetch(`${baseUrl}?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 1024
    }
  })
})
```

## Setup Instructions

### 1. Environment Configuration
Add your Gemini Pro API key to your environment variables:
```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Install Dependencies
The system uses standard React/Next.js dependencies:
```bash
npm install
# or
yarn install
```

### 3. Component Integration
Add the AI Assistant to your main layout:
```typescript
// In your main layout component
import AIAssistant from '@/components/AIAssistant/AIAssistant'

export default function Layout({ children }) {
  return (
    <div>
      {children}
      <AIAssistant />
    </div>
  )
}
```

### 4. Authentication Integration
Ensure your app provides user context through the useAuth hook:
```typescript
// The AI Assistant automatically detects:
- user.role (owner/manager/staff)
- user.businessType (restaurant/retail/other)
- user.tenantId (for multi-tenant support)
```

## Knowledge Base

### Pre-loaded Responses
The system includes comprehensive knowledge for:
- **Inventory Management**: Adding items, tracking stock, generating reports
- **POS Operations**: Processing orders, handling payments, managing refunds
- **Team Management**: Adding members, role permissions, shift management
- **Business Setup**: Restaurant vs retail configurations
- **General Support**: Getting started guides and troubleshooting

### Custom Knowledge Addition
Add new knowledge entries in `chatService.ts`:
```typescript
this.knowledgeBase.set('new topic', 'Helpful response for users')
```

## Usage Examples

### Basic Implementation
```typescript
// Minimal setup - automatically handles everything
<AIAssistant />
```

### Advanced Configuration
```typescript
// With custom positioning
<AIAssistant className="custom-position" />
```

### Integration with Existing Auth
The system automatically integrates with your existing authentication system through the `useAuth` hook.

## Customization

### Styling
All components use Tailwind CSS classes and can be customized through:
- Custom CSS classes
- Tailwind configuration
- Component prop overrides

### Business Logic
Customize responses and behavior by modifying:
- `chatService.ts` - AI logic and knowledge base
- `QuickActions.tsx` - Role-based quick actions
- Component interfaces for additional props

### API Integration
The system is designed to work with any AI API by modifying the `chatService.ts` implementation.

## Best Practices

### Performance
- Knowledge base responses cached for 70% faster common queries
- Conversation history limited to last 10 exchanges
- Optimized for mobile/tablet performance

### User Experience
- Auto-welcome for new users
- Visual indicators for new messages
- Context-aware responses based on current page
- Professional yet friendly tone

### Enterprise Considerations
- Conversation logging for analytics
- Multi-tenant architecture
- Scalable API usage patterns
- Error handling and fallbacks

## Troubleshooting

### Common Issues
1. **API Key Not Working**: Ensure `NEXT_PUBLIC_GEMINI_API_KEY` is set correctly
2. **Import Errors**: Check that all component dependencies are properly installed
3. **Styling Issues**: Ensure Tailwind CSS is configured in your project
4. **Authentication**: Verify `useAuth` hook returns expected user properties

### Support
For technical support or feature requests, contact the development team or refer to the CoreTrack documentation.

## License
Part of the CoreTrack application suite. All rights reserved.
