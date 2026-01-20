#!/bin/bash

# ==============================================================================
# Complete Windows Build and Upload Script (Server Version)
# ==============================================================================
# This script:
# 1. Builds the Tauri Windows application (if on Windows or using cross-compilation)
# 2. Optionally signs the executable (if certificate is available)
# 3. Copies to public/downloads/windows directory
# 4. Updates download links in Next.js app
# 
# Prerequisites:
# - Node.js and npm installed
# - Rust toolchain installed
# - For cross-compilation on macOS/Linux: cargo-xwin or mingw-w64
# - (Optional) Windows code signing certificate
#
# Usage:
#   ./upload-windows-exe.sh <version> [installer-type]
#
# Examples:
#   ./upload-windows-exe.sh "1.0.1"           # Builds both MSI and EXE
#   ./upload-windows-exe.sh "1.0.1" exe       # Builds NSIS EXE only
#   ./upload-windows-exe.sh "1.0.1" msi       # Builds MSI only
#   ./upload-windows-exe.sh "1.0.1" --skip-build  # Skip build, copy existing
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
DOWNLOAD_DIR="$NEXTJS_ROOT/public/downloads/windows"

echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║    TrackEx Windows Build & Distribution Pipeline         ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# ==============================================================================
# STEP 0: Validate Arguments and Environment
# ==============================================================================

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing version argument${NC}"
    echo ""
    echo "Usage: $0 <version> [installer-type] [--skip-build]"
    echo ""
    echo "Examples:"
    echo "  $0 1.0.1              # Builds and copies both MSI and EXE"
    echo "  $0 1.0.1 exe          # Builds and copies NSIS EXE only"
    echo "  $0 1.0.1 msi          # Builds and copies MSI only"
    echo "  $0 1.0.1 --skip-build # Skips build, copies existing files"
    exit 1
fi

VERSION="$1"
INSTALLER_TYPE="${2:-all}"
SKIP_BUILD=false

# Check for --skip-build flag
for arg in "$@"; do
    if [ "$arg" = "--skip-build" ]; then
        SKIP_BUILD=true
    fi
done

# Normalize installer type
case "$INSTALLER_TYPE" in
    exe|nsis)
        INSTALLER_TYPE="exe"
        ;;
    msi|wix)
        INSTALLER_TYPE="msi"
        ;;
    all|both)
        INSTALLER_TYPE="all"
        ;;
    --skip-build)
        INSTALLER_TYPE="all"
        ;;
    *)
        echo -e "${RED}Error: Invalid installer type: $INSTALLER_TYPE${NC}"
        echo "Valid options: exe, msi, all"
        exit 1
        ;;
esac

echo -e "${YELLOW}Version:${NC} $VERSION"
echo -e "${YELLOW}Installer Type:${NC} $INSTALLER_TYPE"
echo -e "${YELLOW}Skip Build:${NC} $SKIP_BUILD"
echo ""

# Verify prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check for required tools
MISSING_TOOLS=()

if ! command -v node &> /dev/null; then
    MISSING_TOOLS+=("node")
fi

if [ "$SKIP_BUILD" = false ]; then
    if ! command -v cargo &> /dev/null; then
        MISSING_TOOLS+=("cargo")
    fi
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

echo -e "${GREEN}✓ Required tools available${NC}"
echo ""

# Create download directory if it doesn't exist
echo -e "${BLUE}Preparing download directory...${NC}"
mkdir -p "$DOWNLOAD_DIR"
echo -e "${GREEN}✓ Download directory ready: $DOWNLOAD_DIR${NC}"
echo ""

# ==============================================================================
# STEP 1: Build the Application (if not skipped)
# ==============================================================================

if [ "$SKIP_BUILD" = false ]; then
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ STEP 1: Building Tauri Application                       ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    cd "$TAURI_ROOT"

    # Check if we're on Windows or need cross-compilation
    OS_TYPE=$(uname -s)
    
    if [[ "$OS_TYPE" == "MINGW"* ]] || [[ "$OS_TYPE" == "MSYS"* ]] || [[ "$OS_TYPE" == "CYGWIN"* ]]; then
        echo -e "${GREEN}✓ Running on Windows${NC}"
        IS_WINDOWS=true
    else
        echo -e "${YELLOW}⚠ Not running on Windows - checking for cross-compilation support${NC}"
        IS_WINDOWS=false
        
        # Check for cross-compilation tools
        if command -v cargo-xwin &> /dev/null; then
            echo -e "${GREEN}✓ cargo-xwin available for cross-compilation${NC}"
            CROSS_COMPILE_TOOL="xwin"
        elif command -v x86_64-w64-mingw32-gcc &> /dev/null; then
            echo -e "${GREEN}✓ mingw-w64 available for cross-compilation${NC}"
            CROSS_COMPILE_TOOL="mingw"
        else
            echo -e "${RED}Error: Cannot build Windows binary on this system${NC}"
            echo ""
            echo "Options:"
            echo "  1. Run this script on Windows"
            echo "  2. Install cargo-xwin: cargo install cargo-xwin"
            echo "  3. Install mingw-w64: brew install mingw-w64 (macOS)"
            echo "  4. Use --skip-build and provide pre-built binaries"
            exit 1
        fi
    fi

    # Install/update dependencies
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install || {
        echo -e "${RED}✗ Failed to install dependencies${NC}"
        exit 1
    }
    echo -e "${GREEN}✓ Dependencies installed${NC}"
    echo ""

    # Build the application
    echo -e "${BLUE}Building Tauri application for Windows...${NC}"
    echo -e "${YELLOW}This may take several minutes...${NC}"
    echo ""

    if [ "$IS_WINDOWS" = true ]; then
        npm run tauri build || {
            echo -e "${RED}✗ Build failed${NC}"
            exit 1
        }
    else
        # Cross-compilation
        if [ "$CROSS_COMPILE_TOOL" = "xwin" ]; then
            npm run tauri build -- --target x86_64-pc-windows-msvc || {
                echo -e "${RED}✗ Build failed${NC}"
                exit 1
            }
        else
            npm run tauri build -- --target x86_64-pc-windows-gnu || {
                echo -e "${RED}✗ Build failed${NC}"
                exit 1
            }
        fi
    fi

    echo ""
    echo -e "${GREEN}✓ Build completed successfully${NC}"
    echo ""
else
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║ STEP 1: Skipping Build (using existing files)            ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    cd "$TAURI_ROOT"
fi

# ==============================================================================
# STEP 2: Locate Built Files
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 2: Locating Built Installers                        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Possible build directories
BUILD_DIRS=(
    "$TAURI_ROOT/src-tauri/target/release/bundle"
    "$TAURI_ROOT/src-tauri/target/x86_64-pc-windows-msvc/release/bundle"
    "$TAURI_ROOT/src-tauri/target/x86_64-pc-windows-gnu/release/bundle"
)

MSI_FILES=()
EXE_FILES=()

for BUILD_DIR in "${BUILD_DIRS[@]}"; do
    # Find MSI files
    if [ -d "$BUILD_DIR/msi" ]; then
        while IFS= read -r -d '' msi; do
            MSI_FILES+=("$msi")
        done < <(find "$BUILD_DIR/msi" -name "*.msi" -type f -print0 2>/dev/null)
    fi
    
    # Find NSIS EXE files
    if [ -d "$BUILD_DIR/nsis" ]; then
        while IFS= read -r -d '' exe; do
            EXE_FILES+=("$exe")
        done < <(find "$BUILD_DIR/nsis" -name "*.exe" -type f -print0 2>/dev/null)
    fi
done

# Check if we found the requested files
if [ "$INSTALLER_TYPE" = "msi" ] || [ "$INSTALLER_TYPE" = "all" ]; then
    if [ ${#MSI_FILES[@]} -eq 0 ]; then
        echo -e "${RED}Error: No MSI files found${NC}"
        echo "Looked in:"
        for dir in "${BUILD_DIRS[@]}"; do
            echo "  - $dir/msi"
        done
        exit 1
    fi
fi

if [ "$INSTALLER_TYPE" = "exe" ] || [ "$INSTALLER_TYPE" = "all" ]; then
    if [ ${#EXE_FILES[@]} -eq 0 ]; then
        echo -e "${RED}Error: No EXE files found${NC}"
        echo "Looked in:"
        for dir in "${BUILD_DIRS[@]}"; do
            echo "  - $dir/nsis"
        done
        exit 1
    fi
fi

echo -e "${GREEN}Found installer files:${NC}"
if [ ${#MSI_FILES[@]} -gt 0 ]; then
    echo -e "${YELLOW}MSI Files:${NC}"
    for msi in "${MSI_FILES[@]}"; do
        echo -e "  - $(basename "$msi")"
    done
fi
if [ ${#EXE_FILES[@]} -gt 0 ]; then
    echo -e "${YELLOW}EXE Files:${NC}"
    for exe in "${EXE_FILES[@]}"; do
        echo -e "  - $(basename "$exe")"
    done
fi
echo ""

# ==============================================================================
# STEP 3: Code Signing (Optional)
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 3: Code Signing (Optional)                          ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for Windows code signing tools and certificate
SIGN_FILES=false

if command -v signtool &> /dev/null; then
    if [[ -n "$WINDOWS_CERTIFICATE_PATH" ]] && [[ -n "$WINDOWS_CERTIFICATE_PASSWORD" ]]; then
        echo -e "${GREEN}✓ Code signing available${NC}"
        SIGN_FILES=true
    else
        echo -e "${YELLOW}⚠ signtool available but certificate not configured${NC}"
        echo "  Set WINDOWS_CERTIFICATE_PATH and WINDOWS_CERTIFICATE_PASSWORD to enable signing"
    fi
elif command -v osslsigncode &> /dev/null; then
    if [[ -n "$WINDOWS_CERTIFICATE_PATH" ]] && [[ -n "$WINDOWS_CERTIFICATE_PASSWORD" ]]; then
        echo -e "${GREEN}✓ osslsigncode available for cross-platform signing${NC}"
        SIGN_FILES=true
        USE_OSSLSIGNCODE=true
    else
        echo -e "${YELLOW}⚠ osslsigncode available but certificate not configured${NC}"
    fi
else
    echo -e "${YELLOW}⚠ No code signing tool available${NC}"
    echo "  On Windows: signtool (Windows SDK)"
    echo "  On macOS/Linux: brew install osslsigncode"
fi

if [ "$SIGN_FILES" = true ]; then
    echo ""
    echo -e "${BLUE}Signing files...${NC}"
    
    ALL_FILES=("${MSI_FILES[@]}" "${EXE_FILES[@]}")
    
    for file in "${ALL_FILES[@]}"; do
        FILENAME=$(basename "$file")
        echo -e "${BLUE}Signing: $FILENAME${NC}"
        
        if [ "$USE_OSSLSIGNCODE" = true ]; then
            osslsigncode sign \
                -pkcs12 "$WINDOWS_CERTIFICATE_PATH" \
                -pass "$WINDOWS_CERTIFICATE_PASSWORD" \
                -n "TrackEx Agent" \
                -i "https://trackex.app" \
                -t http://timestamp.digicert.com \
                -in "$file" \
                -out "${file}.signed" && \
            mv "${file}.signed" "$file" && \
            echo -e "${GREEN}✓ Signed: $FILENAME${NC}" || \
            echo -e "${RED}✗ Failed to sign: $FILENAME${NC}"
        else
            signtool sign \
                /f "$WINDOWS_CERTIFICATE_PATH" \
                /p "$WINDOWS_CERTIFICATE_PASSWORD" \
                /d "TrackEx Agent" \
                /du "https://trackex.app" \
                /t http://timestamp.digicert.com \
                "$file" && \
            echo -e "${GREEN}✓ Signed: $FILENAME${NC}" || \
            echo -e "${RED}✗ Failed to sign: $FILENAME${NC}"
        fi
    done
else
    echo -e "${YELLOW}Skipping code signing${NC}"
fi
echo ""

# ==============================================================================
# STEP 4: Copy to Public Directory
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 4: Copying to Public Directory                      ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

COPIED_FILES=()

copy_file() {
    local FILE_PATH="$1"
    local FILE_TYPE="$2"  # "msi" or "exe"
    
    local FILE_NAME=$(basename "$FILE_PATH")
    
    # Determine architecture from filename
    if [[ "$FILE_NAME" == *"x64"* ]] || [[ "$FILE_NAME" == *"x86_64"* ]]; then
        local ARCH="x64"
    elif [[ "$FILE_NAME" == *"arm64"* ]] || [[ "$FILE_NAME" == *"aarch64"* ]]; then
        local ARCH="arm64"
    else
        local ARCH="x64"  # Default to x64
    fi
    
    # Generate destination filename
    local DEST_FILENAME="trackex-agent-${VERSION}-${ARCH}.${FILE_TYPE}"
    local DEST_PATH="$DOWNLOAD_DIR/$DEST_FILENAME"
    
    echo -e "${BLUE}Copying: $FILE_NAME${NC}"
    echo -e "${YELLOW}Type:${NC} $FILE_TYPE"
    echo -e "${YELLOW}Architecture:${NC} $ARCH"
    echo -e "${YELLOW}Destination:${NC} $DEST_FILENAME"
    echo ""
    
    # Copy the file
    cp "$FILE_PATH" "$DEST_PATH" || {
        echo -e "${RED}✗ Failed to copy file${NC}"
        return 1
    }
    
    # Get file size
    local FILE_SIZE=$(stat -f%z "$DEST_PATH" 2>/dev/null || stat -c%s "$DEST_PATH" 2>/dev/null || echo "unknown")
    
    if [ "$FILE_SIZE" != "unknown" ]; then
        local FILE_SIZE_MB=$(echo "scale=2; $FILE_SIZE / 1024 / 1024" | bc)
        echo -e "${GREEN}✓ Copy successful${NC}"
        echo -e "${YELLOW}Size:${NC} ${FILE_SIZE_MB} MB"
    else
        echo -e "${GREEN}✓ Copy successful${NC}"
    fi
    
    # Generate download URL (relative to Next.js public folder)
    local DOWNLOAD_URL="/downloads/windows/$DEST_FILENAME"
    
    # Save file info
    COPIED_FILES+=("${FILE_TYPE}:${ARCH}:${DOWNLOAD_URL}:${DEST_FILENAME}")
    
    echo ""
}

# Copy MSI files
if [ "$INSTALLER_TYPE" = "msi" ] || [ "$INSTALLER_TYPE" = "all" ]; then
    for msi in "${MSI_FILES[@]}"; do
        copy_file "$msi" "msi"
    done
fi

# Copy EXE files
if [ "$INSTALLER_TYPE" = "exe" ] || [ "$INSTALLER_TYPE" = "all" ]; then
    for exe in "${EXE_FILES[@]}"; do
        copy_file "$exe" "exe"
    done
fi

# ==============================================================================
# STEP 5: Update Download Page & Environment Variables
# ==============================================================================

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║ STEP 5: Updating Download Page & Links                   ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Update .env.production with all download URLs
for file_info in "${COPIED_FILES[@]}"; do
    FILE_TYPE="${file_info%%:*}"
    REST="${file_info#*:}"
    ARCH="${REST%%:*}"
    REST="${REST#*:}"
    URL="${REST%%:*}"
    
    # Determine environment variable name
    if [ "$FILE_TYPE" = "exe" ]; then
        if [ "$ARCH" = "arm64" ]; then
            ENV_VAR_NAME="NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL_ARM64"
        else
            ENV_VAR_NAME="NEXT_PUBLIC_WINDOWS_DOWNLOAD_URL_X64"
        fi
    else  # msi
        if [ "$ARCH" = "arm64" ]; then
            ENV_VAR_NAME="NEXT_PUBLIC_WINDOWS_MSI_DOWNLOAD_URL_ARM64"
        else
            ENV_VAR_NAME="NEXT_PUBLIC_WINDOWS_MSI_DOWNLOAD_URL_X64"
        fi
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
        echo "# Windows Desktop Agent Download URL - $ARCH $FILE_TYPE (Updated: $(date))" >> "$ENV_FILE"
        echo "${ENV_VAR_NAME}=${URL}" >> "$ENV_FILE"
    fi
    
    echo -e "${GREEN}✓ ${ENV_VAR_NAME} updated${NC}"
done

# Update version
echo -e "${BLUE}Updating version...${NC}"
if grep -q "^NEXT_PUBLIC_WINDOWS_DOWNLOAD_VERSION=" "$ENV_FILE"; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|^NEXT_PUBLIC_WINDOWS_DOWNLOAD_VERSION=.*|NEXT_PUBLIC_WINDOWS_DOWNLOAD_VERSION=${VERSION}|" "$ENV_FILE"
    else
        sed -i "s|^NEXT_PUBLIC_WINDOWS_DOWNLOAD_VERSION=.*|NEXT_PUBLIC_WINDOWS_DOWNLOAD_VERSION=${VERSION}|" "$ENV_FILE"
    fi
else
    echo "NEXT_PUBLIC_WINDOWS_DOWNLOAD_VERSION=${VERSION}" >> "$ENV_FILE"
fi
echo -e "${GREEN}✓ Version updated${NC}"
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
if [ "$SKIP_BUILD" = false ]; then
    echo -e "  ✓ Built Tauri application for Windows"
fi
if [ "$SIGN_FILES" = true ]; then
    echo -e "  ✓ Code signed installers"
else
    echo -e "  ⚠ Skipped code signing (no certificate configured)"
fi
echo -e "  ✓ Copied to public/downloads/windows"
echo -e "  ✓ Updated environment variables"
echo ""

echo -e "${BLUE}Copied Files:${NC}"
for file_info in "${COPIED_FILES[@]}"; do
    FILE_TYPE="${file_info%%:*}"
    REST="${file_info#*:}"
    ARCH="${REST%%:*}"
    REST="${REST#*:}"
    URL="${REST%%:*}"
    FILENAME="${REST#*:}"
    echo -e "  ${YELLOW}[$ARCH $FILE_TYPE]${NC} $FILENAME"
    echo -e "    ${CYAN}URL:${NC} $URL"
done
echo ""

echo -e "${BLUE}Environment Variables:${NC}"
grep "NEXT_PUBLIC_WINDOWS" "$ENV_FILE" 2>/dev/null | while read line; do
    echo -e "  $line"
done
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Review the changes"
echo -e "  2. Commit updated files:"
echo -e "     ${CYAN}git add Desktop/trackex/.env.production${NC}"
echo -e "     ${CYAN}git add Desktop/trackex/public/downloads/windows/${NC}"
echo -e "     ${CYAN}git commit -m \"Release Windows v${VERSION}\"${NC}"
echo -e ""
echo -e "  3. Deploy Next.js app:"
echo -e "     ${CYAN}cd $NEXTJS_ROOT${NC}"
echo -e "     ${CYAN}npm run build${NC}"
echo -e "     ${CYAN}./deploy-update.sh${NC}"
echo -e ""
echo -e "  4. Test the download:"
echo -e "     ${CYAN}Visit https://trackex.app/downloads/windows/trackex-agent-${VERSION}-x64.exe${NC}"
echo ""

echo -e "${GREEN}🚀 Your Windows app is ready for distribution!${NC}"
echo ""