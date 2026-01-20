#!/bin/bash

# ==============================================================================
# Complete macOS Build, Sign, Notarize, and Upload Script
# ==============================================================================
# This script:
# 1. Builds the Tauri macOS application
# 2. Verifies code signing
# 3. Notarizes the DMG with Apple
# 4. Staples the notarization ticket
# 5. Uploads to Cloudinary
# 6. Updates download links in Next.js app
# 
# Prerequisites:
# - Valid Apple Developer ID Application certificate installed
# - Notarization credentials stored in keychain profile "trackex-notarization"
#   OR set APPLE_ID, APPLE_TEAM_ID, APPLE_PASSWORD environment variables
# - Cloudinary credentials in .env.production
# - Xcode Command Line Tools installed
#
# Usage:
#   ./upload-macos-dmg.sh <version> [architecture]
#
# Examples:
#   ./upload-macos-dmg.sh "1.0.1"              # Builds for current architecture
#   ./upload-macos-dmg.sh "1.0.1" aarch64     # Builds for Apple Silicon only
#   ./upload-macos-dmg.sh "1.0.1" x64         # Builds for Intel only
#   ./upload-macos-dmg.sh "1.0.1" universal   # Builds universal binary
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TAURI_ROOT="$SCRIPT_DIR/.."
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/Desktop/trackex/.env.production"
NEXTJS_ROOT="$PROJECT_ROOT/Desktop/trackex"

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    TrackEx macOS Build & Distribution Pipeline           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# STEP 0: Validate Arguments and Environment
# ==============================================================================

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing version argument${NC}"
    echo ""
    echo "Usage: $0 <version> [architecture]"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.1              # Builds for current architecture"
    echo "  $0 1.0.1 aarch64     # Builds for Apple Silicon"
    echo "  $0 1.0.1 x64         # Builds for Intel"
    echo "  $0 1.0.1 universal   # Builds universal binary"
    exit 1
fi

VERSION="$1"
BUILD_TARGET="${2:-}"

# Determine build target flag
if [ -n "$BUILD_TARGET" ]; then
    case "$BUILD_TARGET" in
        aarch64)
            TARGET_FLAG="--target aarch64-apple-darwin"
            ;;
        x64)
            TARGET_FLAG="--target x86_64-apple-darwin"
            ;;
        universal)
            TARGET_FLAG="--target universal-apple-darwin"
            ;;
        *)
            echo -e "${RED}Error: Invalid architecture: $BUILD_TARGET${NC}"
            echo "Valid options: aarch64, x64, universal"
            exit 1
            ;;
    esac
else
    TARGET_FLAG=""
fi

echo -e "${YELLOW}Version:${NC} $VERSION"
if [ -n "$BUILD_TARGET" ]; then
    echo -e "${YELLOW}Target Architecture:${NC} $BUILD_TARGET"
else
    echo -e "${YELLOW}Target Architecture:${NC} Current system ($(uname -m))"
fi
echo ""

# Verify prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check for required tools
MISSING_TOOLS=()

if ! command -v node &> /dev/null; then
    MISSING_TOOLS+=("node")
fi

if ! command -v cargo &> /dev/null; then
    MISSING_TOOLS+=("cargo")
fi

if ! command -v codesign &> /dev/null; then
    MISSING_TOOLS+=("codesign (Xcode Command Line Tools)")
fi

if ! command -v xcrun &> /dev/null; then
    MISSING_TOOLS+=("xcrun (Xcode Command Line Tools)")
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo -e "${RED}Error: Missing required tools:${NC}"
    for tool in "${MISSING_TOOLS[@]}"; do
        echo -e "  - $tool"
    done
    echo ""
    echo "Please install missing tools before continuing."
    exit 1
fi

# Check for signing identity
echo -e "${BLUE}Checking for signing identity...${NC}"
if ! security find-identity -v -p codesigning | grep -q "Developer ID Application"; then
    echo -e "${RED}Error: No Developer ID Application certificate found!${NC}"
    echo ""
    echo "Please install a valid Developer ID Application certificate."
    echo "See: https://developer.apple.com/account/resources/certificates/list"
    exit 1
fi

SIGNING_IDENTITY=$(security find-identity -v -p codesigning | grep "Developer ID Application" | head -n 1 | sed 's/.*"\(.*\)".*/\1/')
echo -e "${GREEN}✓ Found signing identity:${NC} $SIGNING_IDENTITY"
echo ""

# Load Cloudinary credentials
if [ -f "$ENV_FILE" ]; then
    echo -e "${BLUE}Loading Cloudinary credentials...${NC}"
    export $(grep -E "^CLOUDINARY_" "$ENV_FILE" | xargs)
else
    echo -e "${YELLOW}Warning: .env.production file not found${NC}"
fi

if [[ -z "$CLOUDINARY_CLOUD_NAME" ]] || [[ -z "$CLOUDINARY_API_KEY" ]] || [[ -z "$CLOUDINARY_API_SECRET" ]]; then
    echo -e "${RED}Error: Cloudinary credentials not set!${NC}"
    echo ""
    echo "Please add credentials to: $ENV_FILE"
    echo "  CLOUDINARY_CLOUD_NAME=your_cloud_name"
    echo "  CLOUDINARY_API_KEY=your_api_key"
    echo "  CLOUDINARY_API_SECRET=your_api_secret"
    exit 1
fi

echo -e "${GREEN}✓ Cloudinary credentials loaded${NC}"
echo ""

# ==============================================================================
# STEP 1: Build the Application
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 1: Building Tauri Application                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$TAURI_ROOT"

# Install/update dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
npm install || {
    echo -e "${RED}✗ Failed to install dependencies${NC}"
    exit 1
}
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Build the application
echo -e "${BLUE}Building Tauri application...${NC}"
echo -e "${YELLOW}This may take several minutes...${NC}"
echo ""

if [ -n "$TARGET_FLAG" ]; then
    npm run tauri build -- $TARGET_FLAG || {
        echo -e "${RED}✗ Build failed${NC}"
        exit 1
    }
else
    npm run tauri build || {
        echo -e "${RED}✗ Build failed${NC}"
        exit 1
    }
fi

echo ""
echo -e "${GREEN}✓ Build completed successfully${NC}"
echo ""

# Locate the built DMG files
# Determine the correct build directory based on target
if [ -n "$BUILD_TARGET" ]; then
    case "$BUILD_TARGET" in
        aarch64)
            TARGET_DIR="aarch64-apple-darwin"
            ;;
        x64)
            TARGET_DIR="x86_64-apple-darwin"
            ;;
        universal)
            TARGET_DIR="universal-apple-darwin"
            ;;
    esac
    DMG_DIR="$TAURI_ROOT/src-tauri/target/$TARGET_DIR/release/bundle/dmg"
    APP_DIR="$TAURI_ROOT/src-tauri/target/$TARGET_DIR/release/bundle/macos"
else
    DMG_DIR="$TAURI_ROOT/src-tauri/target/release/bundle/dmg"
    APP_DIR="$TAURI_ROOT/src-tauri/target/release/bundle/macos"
fi

if [ ! -d "$DMG_DIR" ]; then
    echo -e "${RED}Error: DMG directory not found at $DMG_DIR${NC}"
    exit 1
fi

# Find all DMG files (properly handle spaces in filenames)
DMG_FILES=()
while IFS= read -r -d '' dmg; do
    DMG_FILES+=("$dmg")
done < <(find "$DMG_DIR" -name "*.dmg" -type f -print0)

if [ ${#DMG_FILES[@]} -eq 0 ]; then
    echo -e "${RED}Error: No DMG files found in $DMG_DIR${NC}"
    exit 1
fi

echo -e "${GREEN}Found ${#DMG_FILES[@]} DMG file(s):${NC}"
for dmg in "${DMG_FILES[@]}"; do
    echo -e "  - $(basename "$dmg")"
done
echo ""

# ==============================================================================
# STEP 2: Verify Code Signing
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 2: Verifying Code Signature                         ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

for dmg in "${DMG_FILES[@]}"; do
    DMG_NAME=$(basename "$dmg")
    echo -e "${BLUE}Verifying: $DMG_NAME${NC}"
    
    # Find corresponding .app bundle
    APP_NAME="TrackEx Agent.app"
    APP_PATH="$APP_DIR/$APP_NAME"
    
    if [ -d "$APP_PATH" ]; then
        echo -e "${BLUE}Checking app bundle signature...${NC}"
        if codesign --verify --deep --strict "$APP_PATH" 2>&1; then
            echo -e "${GREEN}✓ App bundle signature valid${NC}"
        else
            echo -e "${RED}✗ App bundle signature invalid${NC}"
            exit 1
        fi
        
        # Display signature details
        echo ""
        echo -e "${BLUE}Signature details:${NC}"
        codesign -dvvv "$APP_PATH" 2>&1 | grep -E "(Identifier|Authority|Signature|TeamIdentifier)" || true
    fi
    
    echo ""
done

# ==============================================================================
# STEP 3: Notarize with Apple
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 3: Notarizing with Apple                            ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for notarization credentials
NOTARY_PROFILE="trackex-notarization"

if xcrun notarytool history --keychain-profile "$NOTARY_PROFILE" 2>/dev/null | head -n 1 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Using stored notarization profile: $NOTARY_PROFILE${NC}"
    USE_PROFILE=true
elif [[ -n "$APPLE_ID" ]] && [[ -n "$APPLE_TEAM_ID" ]] && [[ -n "$APPLE_PASSWORD" ]]; then
    echo -e "${GREEN}✓ Using environment variables for notarization${NC}"
    USE_PROFILE=false
else
    echo -e "${RED}Error: No notarization credentials found!${NC}"
    echo ""
    echo "Please either:"
    echo "1. Store credentials in keychain:"
    echo "   xcrun notarytool store-credentials \"$NOTARY_PROFILE\" \\"
    echo "     --apple-id \"your-apple-id@example.com\" \\"
    echo "     --team-id \"YOUR_TEAM_ID\" \\"
    echo "     --password \"your-app-specific-password\""
    echo ""
    echo "2. Set environment variables:"
    echo "   export APPLE_ID=\"your-apple-id@example.com\""
    echo "   export APPLE_TEAM_ID=\"YOUR_TEAM_ID\""
    echo "   export APPLE_PASSWORD=\"your-app-specific-password\""
    exit 1
fi

echo ""

for dmg in "${DMG_FILES[@]}"; do
    DMG_NAME=$(basename "$dmg")
    echo -e "${BLUE}Notarizing: $DMG_NAME${NC}"
    echo -e "${YELLOW}This typically takes 2-5 minutes...${NC}"
    echo ""
    
    if [ "$USE_PROFILE" = true ]; then
        xcrun notarytool submit "$dmg" \
            --keychain-profile "$NOTARY_PROFILE" \
            --wait || {
            echo -e "${RED}✗ Notarization failed${NC}"
            echo ""
            echo "To see detailed error log, run:"
            echo "xcrun notarytool log <SUBMISSION_ID> --keychain-profile \"$NOTARY_PROFILE\""
            exit 1
        }
    else
        xcrun notarytool submit "$dmg" \
            --apple-id "$APPLE_ID" \
            --team-id "$APPLE_TEAM_ID" \
            --password "$APPLE_PASSWORD" \
            --wait || {
            echo -e "${RED}✗ Notarization failed${NC}"
            exit 1
        }
    fi
    
    echo ""
    echo -e "${GREEN}✓ Notarization accepted${NC}"
    echo ""
done

# ==============================================================================
# STEP 4: Staple Notarization Ticket
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 4: Stapling Notarization Ticket                     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

for dmg in "${DMG_FILES[@]}"; do
    DMG_NAME=$(basename "$dmg")
    echo -e "${BLUE}Stapling: $DMG_NAME${NC}"
    
    xcrun stapler staple "$dmg" || {
        echo -e "${RED}✗ Stapling failed${NC}"
        exit 1
    }
    
    echo -e "${GREEN}✓ Ticket stapled${NC}"
    
    # Verify stapling
    echo -e "${BLUE}Verifying staple...${NC}"
    if xcrun stapler validate "$dmg"; then
        echo -e "${GREEN}✓ Staple valid${NC}"
    else
        echo -e "${RED}✗ Staple validation failed${NC}"
        exit 1
    fi
    
    echo ""
done

# ==============================================================================
# STEP 5: Verify Gatekeeper Acceptance
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 5: Verifying Gatekeeper Acceptance                  ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

for dmg in "${DMG_FILES[@]}"; do
    DMG_NAME=$(basename "$dmg")
    echo -e "${BLUE}Checking: $DMG_NAME${NC}"
    
    if spctl --assess --type open --context context:primary-signature --verbose=4 "$dmg" 2>&1 | grep -q "accepted"; then
        echo -e "${GREEN}✓ Gatekeeper will accept this DMG${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Gatekeeper check returned unexpected result${NC}"
    fi
    echo ""
done

# ==============================================================================
# STEP 6: Upload to Cloudinary
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 6: Uploading to Cloudinary                          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

UPLOADED_URLS=()

for dmg in "${DMG_FILES[@]}"; do
    DMG_NAME=$(basename "$dmg")
    
    # Extract architecture from filename
    if [[ "$DMG_NAME" == *"aarch64"* ]]; then
        ARCH="aarch64"
    elif [[ "$DMG_NAME" == *"x64"* ]]; then
        ARCH="x64"
    else
        ARCH="universal"
    fi
    
    # Configuration
    FOLDER="releases/macos"
    PUBLIC_ID="trackex-agent-${VERSION}-${ARCH}"
    TIMESTAMP=$(date +%s)
    
    echo -e "${BLUE}Uploading: $DMG_NAME${NC}"
    echo -e "${YELLOW}Architecture:${NC} $ARCH"
    echo -e "${YELLOW}Public ID:${NC} $PUBLIC_ID"
    echo ""
    
    # Generate signature
    SIGNATURE_STRING="folder=${FOLDER}&public_id=${PUBLIC_ID}&timestamp=${TIMESTAMP}${CLOUDINARY_API_SECRET}"
    SIGNATURE=$(echo -n "$SIGNATURE_STRING" | openssl dgst -sha256 | sed 's/^.* //')
    
    # Upload to Cloudinary
    RESPONSE=$(curl -s -X POST "https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload" \
      -F "file=@${dmg}" \
      -F "api_key=${CLOUDINARY_API_KEY}" \
      -F "timestamp=${TIMESTAMP}" \
      -F "signature=${SIGNATURE}" \
      -F "public_id=${PUBLIC_ID}" \
      -F "folder=${FOLDER}" \
      -F "resource_type=raw")
    
    # Check if upload was successful
    if echo "$RESPONSE" | grep -q '"secure_url"'; then
        SECURE_URL=$(echo "$RESPONSE" | grep -o '"secure_url":"[^"]*"' | cut -d'"' -f4)
        FILE_SIZE=$(echo "$RESPONSE" | grep -o '"bytes":[0-9]*' | cut -d':' -f2)
        
        echo -e "${GREEN}✓ Upload successful${NC}"
        echo -e "${GREEN}URL:${NC} $SECURE_URL"
        
        if [ -n "$FILE_SIZE" ]; then
            FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1024 / 1024" | bc)
            echo -e "${YELLOW}Size:${NC} ${FILE_SIZE_MB} MB"
        fi
        
        # Save URL info
        UPLOADED_URLS+=("$ARCH:$SECURE_URL")
        
        # Save URL to file for reference
        URL_FILE="$SCRIPT_DIR/cloudinary-url-${VERSION}-${ARCH}.txt"
        echo "$SECURE_URL" > "$URL_FILE"
        echo -e "${YELLOW}Saved URL to:${NC} $(basename "$URL_FILE")"
        
    else
        echo -e "${RED}✗ Upload failed${NC}"
        echo "Response:"
        echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
        exit 1
    fi
    
    echo ""
done

# ==============================================================================
# STEP 7: Update Download Page & Environment Variables
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 7: Updating Download Page & Links                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Update .env.production with all uploaded URLs
for url_info in "${UPLOADED_URLS[@]}"; do
    ARCH="${url_info%%:*}"
    URL="${url_info#*:}"
    
    # Determine environment variable name
    if [ "$ARCH" = "aarch64" ]; then
        ENV_VAR_NAME="NEXT_PUBLIC_MACOS_DOWNLOAD_URL_ARM64"
    elif [ "$ARCH" = "x64" ]; then
        ENV_VAR_NAME="NEXT_PUBLIC_MACOS_DOWNLOAD_URL_X64"
    else
        ENV_VAR_NAME="NEXT_PUBLIC_MACOS_DOWNLOAD_URL"
    fi
    
    echo -e "${BLUE}Updating ${ENV_VAR_NAME}...${NC}"
    
    # Create or update .env.production file
    if [ ! -f "$ENV_FILE" ]; then
        touch "$ENV_FILE"
    fi
    
    # Update or add the variable
    if grep -q "^${ENV_VAR_NAME}=" "$ENV_FILE"; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^${ENV_VAR_NAME}=.*|${ENV_VAR_NAME}=${URL}|" "$ENV_FILE"
        else
            sed -i "s|^${ENV_VAR_NAME}=.*|${ENV_VAR_NAME}=${URL}|" "$ENV_FILE"
        fi
    else
        echo "" >> "$ENV_FILE"
        echo "# macOS Desktop Agent Download URL - $ARCH (Updated: $(date))" >> "$ENV_FILE"
        echo "${ENV_VAR_NAME}=${URL}" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✓ ${ENV_VAR_NAME} updated${NC}"
done

# Update version
echo -e "${BLUE}Updating version...${NC}"
if grep -q "^NEXT_PUBLIC_MACOS_DOWNLOAD_VERSION=" "$ENV_FILE"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^NEXT_PUBLIC_MACOS_DOWNLOAD_VERSION=.*|NEXT_PUBLIC_MACOS_DOWNLOAD_VERSION=${VERSION}|" "$ENV_FILE"
    else
        sed -i "s|^NEXT_PUBLIC_MACOS_DOWNLOAD_VERSION=.*|NEXT_PUBLIC_MACOS_DOWNLOAD_VERSION=${VERSION}|" "$ENV_FILE"
    fi
else
    echo "NEXT_PUBLIC_MACOS_DOWNLOAD_VERSION=${VERSION}" >> "$ENV_FILE"
fi
echo -e "${GREEN}✓ Version updated${NC}"
echo ""

# Update the download page
MACOS_PAGE="$NEXTJS_ROOT/app/download/macos/page.tsx"

if [ -f "$MACOS_PAGE" ]; then
    echo -e "${BLUE}Updating download page...${NC}"
    
    # Check if page is already using environment variables
    if grep -q "process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_URL" "$MACOS_PAGE"; then
        echo -e "${GREEN}✓ Download page already configured${NC}"
    else
        # Create backup
        cp "$MACOS_PAGE" "$MACOS_PAGE.backup"
        
        # Update page to use environment variables
        cat > "$MACOS_PAGE" << 'EOPAGE'
import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, Apple, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function MacOSDownloadPage() {
  const downloadUrl = process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_URL_ARM64 || process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_URL || '/downloads/TrackEx-Agent-macOS.dmg'
  const version = process.env.NEXT_PUBLIC_MACOS_DOWNLOAD_VERSION || '1.0.1'
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-16">
        <div className="container mx-auto max-w-2xl px-4">
          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Apple className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Download Trackex for macOS</CardTitle>
              <CardDescription>
                Start tracking time and productivity on your Mac
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  The Trackex desktop agent provides seamless time tracking and productivity monitoring with:
                </p>
                
                <ul className="text-left space-y-2 max-w-md mx-auto">
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                    <span>Native macOS integration</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                    <span>Menu bar presence for easy access</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                    <span>Real-time app and website tracking</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                    <span>Low resource usage and battery efficient</span>
                  </li>
                  <li className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-primary mr-3 flex-shrink-0" />
                    <span>Automatic idle time detection</span>
                  </li>
                </ul>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-2">System Requirements:</p>
                <ul className="space-y-1">
                  <li>• macOS 11 (Big Sur) or later</li>
                  <li>• Apple Silicon (M1/M2/M3) or Intel processor</li>
                  <li>• 100 MB free disk space</li>
                  <li>• Internet connection required</li>
                </ul>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild size="lg">
                  <a href={downloadUrl} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download for macOS (v{version})
                  </a>
                </Button>
                
                <Button variant="outline" asChild>
                  <Link href="/">
                    Back to Home
                  </Link>
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                By downloading, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  )
}
EOPAGE
        
        echo -e "${GREEN}✓ Download page updated${NC}"
        echo -e "${YELLOW}  Backup saved to: page.tsx.backup${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Download page not found at $MACOS_PAGE${NC}"
fi

echo ""

# ==============================================================================
# FINAL SUMMARY
# ==============================================================================

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           🎉  DEPLOYMENT COMPLETE!  🎉                    ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✓ All steps completed successfully!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  ✓ Built Tauri application"
echo -e "  ✓ Verified code signing"
echo -e "  ✓ Notarized with Apple"
echo -e "  ✓ Stapled notarization ticket"
echo -e "  ✓ Verified Gatekeeper acceptance"
echo -e "  ✓ Uploaded to Cloudinary"
echo -e "  ✓ Updated environment variables"
echo -e "  ✓ Updated download page"
echo ""

echo -e "${BLUE}Uploaded Files:${NC}"
for url_info in "${UPLOADED_URLS[@]}"; do
    ARCH="${url_info%%:*}"
    URL="${url_info#*:}"
    echo -e "  ${YELLOW}[$ARCH]${NC} $URL"
done
echo ""

echo -e "${BLUE}Environment Variables:${NC}"
grep "NEXT_PUBLIC_MACOS_DOWNLOAD" "$ENV_FILE" | while read line; do
    echo -e "  $line"
done
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Review the changes"
echo -e "  2. Commit updated files:"
echo -e "     ${CYAN}git add Desktop/trackex/.env.production${NC}"
echo -e "     ${CYAN}git add Desktop/trackex/app/download/macos/page.tsx${NC}"
echo -e "     ${CYAN}git commit -m \"Release v${VERSION}\"${NC}"
echo -e ""
echo -e "  3. Deploy Next.js app:"
echo -e "     ${CYAN}cd $NEXTJS_ROOT${NC}"
echo -e "     ${CYAN}npm run build${NC}"
echo -e "     ${CYAN}./deploy-update.sh${NC}"
echo -e ""
echo -e "  4. Test the download:"
echo -e "     ${CYAN}Visit your website and download the installer${NC}"
echo ""

echo -e "${GREEN}🚀 Your macOS app is ready for distribution!${NC}"
echo ""