#!/bin/sh

# ci_post_clone.sh - Xcode Cloud Post-Clone Script
#
# This script runs after Xcode Cloud clones the repository.
# Use it to install any dependencies or configure the environment.
#
# Xcode Cloud Environment Variables:
# - CI_XCODE_PROJECT: Path to .xcodeproj
# - CI_XCODE_SCHEME: Scheme being built
# - CI_PRODUCT: Product name
# - CI_WORKFLOW: Workflow name
# - CI_BUILD_NUMBER: Build number
# - CI_COMMIT: Git commit SHA
# - CI_BRANCH: Git branch name
# - CI_TAG: Git tag (if triggered by tag)
#
# Part of HAP-680 implementation.
# See: https://developer.apple.com/documentation/xcode/writing-custom-build-scripts

set -e

echo "=== Xcode Cloud Post-Clone Script ==="
echo "Project: $CI_XCODE_PROJECT"
echo "Scheme: $CI_XCODE_SCHEME"
echo "Build Number: $CI_BUILD_NUMBER"
echo "Commit: $CI_COMMIT"
echo "Branch: $CI_BRANCH"

# Display Xcode version
echo ""
echo "=== Xcode Version ==="
xcodebuild -version

# Display macOS version
echo ""
echo "=== macOS Version ==="
sw_vers

# Install Homebrew dependencies (if needed)
# Uncomment and modify as needed:
#
# echo ""
# echo "=== Installing Dependencies ==="
# if ! command -v swiftlint &> /dev/null; then
#     echo "Installing SwiftLint..."
#     brew install swiftlint
# fi

# Install Swift Package dependencies (if any SPM packages need special setup)
# echo ""
# echo "=== Resolving Swift Packages ==="
# xcodebuild -resolvePackageDependencies -project "$CI_XCODE_PROJECT" -scheme "$CI_XCODE_SCHEME"

# Set build number to Xcode Cloud build number
if [ -n "$CI_BUILD_NUMBER" ]; then
    echo ""
    echo "=== Setting Build Number ==="
    echo "Build number: $CI_BUILD_NUMBER"

    # Find Info.plist path
    INFO_PLIST="Happy/Info.plist"

    if [ -f "$INFO_PLIST" ]; then
        /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $CI_BUILD_NUMBER" "$INFO_PLIST"
        echo "Updated CFBundleVersion to $CI_BUILD_NUMBER"
    else
        echo "Warning: Info.plist not found at $INFO_PLIST"
    fi
fi

echo ""
echo "=== Post-Clone Complete ==="
