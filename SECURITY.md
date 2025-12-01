# Security Measures

This document outlines the security measures implemented in the SMITE 2 Mastery app to protect user data and privacy.

## Privacy-First Architecture

- **No Data Collection**: The app does not collect, store, or transmit any personal information
- **Local-Only Storage**: All data remains on the user's device
- **No Analytics**: No tracking, analytics, or advertising services are used
- **No Third-Party SDKs**: Only essential, trusted libraries are included

## Network Security

### HTTPS Enforcement
- All external network requests use HTTPS encryption
- Network security configuration enforces secure connections
- TLS 1.2 minimum required for all connections

### Domain Whitelisting
Only connections to approved domains are allowed:
- `smitecalculator.pro` - Game data source
- `smite2.com` - Official SMITE 2 news
- `webcdn.hirezstudios.com` - CDN resources
- `tracker.gg` - Player profile links (user-initiated)
- `termsfeed.com` - Privacy policy

### iOS ATS Configuration
App Transport Security (ATS) is configured to:
- Require HTTPS for all connections
- Only allow specific exceptions with TLS 1.2+
- Prevent insecure data transmission

### Android Network Security
- Cleartext traffic disabled (`usesCleartextTraffic: false`)
- Secure network connections enforced

## Input Validation & Sanitization

All user inputs are validated and sanitized:

### Search Queries
- Maximum length: 200 characters
- HTML tags stripped
- Script tags removed
- Special characters sanitized

### URL Validation
- HTTPS enforcement
- Domain whitelist checking
- Protocol validation
- Hostname verification

### Data Validation
- Type checking for all inputs
- Object structure validation
- Safe value checking
- XSS prevention measures

## Code Security

### Best Practices
- Input validation on all user inputs
- Output encoding for displayed data
- Secure coding patterns
- Regular dependency updates

### Security Utilities
Located in `utils/security.js`:
- `sanitizeInput()` - Removes dangerous characters
- `isValidSecureUrl()` - Validates URLs
- `validateSearchQuery()` - Sanitizes search input
- `isValidDataObject()` - Validates data structure
- `isSafeValue()` - Checks value safety

## Data Protection

### No Personal Data Storage
- No user accounts
- No login credentials
- No personal information collected
- No device identifiers stored

### Local Storage Only
- All app data stored locally
- No cloud sync
- No server-side storage
- No data transmission

## External Links

When users click external links:
- Links open in external browser (not in-app WebView for security)
- Clear indication when leaving the app
- User must explicitly confirm external navigation

## Compliance

### Privacy Policy
Full privacy policy available at:
https://www.termsfeed.com/live/39fa5ec6-7ecb-4684-b2e2-99a6b1e4cde3

### Children's Privacy
- App does not target children under 13
- No data collection from children
- Compliant with COPPA requirements

## Security Updates

Security measures are regularly reviewed and updated:
- Last updated: November 27, 2025
- Regular security audits
- Dependency vulnerability scanning
- Best practice updates

## Reporting Security Issues

If you discover a security vulnerability, please contact:
- Email: [email protected]

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact

## Recommendations for Users

1. Keep the app updated to the latest version
2. Only use trusted networks when accessing external links
3. Review privacy settings on your device
4. Contact support if you notice any suspicious activity

---

**Note**: This app is designed with privacy and security as top priorities. We do not collect user data, and all measures are in place to protect user information even though no personal data is collected.

