#!/bin/sh

# ci_post_xcodebuild.sh - Xcode Cloud Post-Build Script
#
# This script runs after each xcodebuild invocation.
# Use it for post-processing, artifact management, or notifications.
#
# Part of HAP-680 implementation.
# See: https://developer.apple.com/documentation/xcode/writing-custom-build-scripts

set -e

echo "=== Xcode Cloud Post-Build Script ==="
echo "Build Action: $CI_XCODEBUILD_ACTION"
echo "Exit Code: $CI_XCODEBUILD_EXIT_CODE"

# Check if build succeeded
if [ "$CI_XCODEBUILD_EXIT_CODE" -ne 0 ]; then
    echo "Build failed with exit code: $CI_XCODEBUILD_EXIT_CODE"
    exit 0  # Don't fail the script, let Xcode Cloud handle the build failure
fi

# Post-archive processing
if [ "$CI_XCODEBUILD_ACTION" = "archive" ]; then
    echo ""
    echo "=== Archive Completed Successfully ==="

    # The archive path is available in CI_ARCHIVE_PATH
    if [ -n "$CI_ARCHIVE_PATH" ]; then
        echo "Archive path: $CI_ARCHIVE_PATH"

        # List archive contents for verification
        echo ""
        echo "Archive contents:"
        ls -la "$CI_ARCHIVE_PATH" 2>/dev/null || echo "Could not list archive contents"
    fi
fi

# Post-test processing
if [ "$CI_XCODEBUILD_ACTION" = "test" ]; then
    echo ""
    echo "=== Tests Completed ==="

    # Test results are in CI_RESULT_BUNDLE_PATH
    if [ -n "$CI_RESULT_BUNDLE_PATH" ]; then
        echo "Result bundle: $CI_RESULT_BUNDLE_PATH"
    fi
fi

echo ""
echo "=== Post-Build Complete ==="
