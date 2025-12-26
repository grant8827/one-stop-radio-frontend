<?php

// Change to the Laravel directory
chdir(__DIR__ . '/rentalhist-backend');

// Include Laravel's bootstrap
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

// Boot the application
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

try {
    // Find the user
    $user = App\Models\User::where('email', 'greggrant3760@gmail.com')->first();
    
    if (!$user) {
        echo "❌ User with email 'greggrant3760@gmail.com' not found.\n";
        exit(1);
    }
    
    echo "📧 User Found: {$user->email}\n";
    echo "👤 User ID: {$user->id}\n";
    echo "📅 Created: {$user->created_at}\n";
    echo "\n🔍 CURRENT VERIFICATION STATUS:\n";
    echo "==============================\n";
    
    // Check all verification-related fields
    printf("%-30s: %s\n", 'Email Verified At', $user->email_verified_at ?? 'NULL');
    printf("%-30s: %s\n", 'General Verified', $user->verified ? '✅ TRUE' : '❌ FALSE');
    printf("%-30s: %s\n", 'Tenant Verified', $user->tenant_verified ? '✅ TRUE' : '❌ FALSE');
    printf("%-30s: %s\n", 'Verified for Existing', $user->is_verified_for_existing ? '✅ TRUE' : '❌ FALSE');
    printf("%-30s: %s\n", 'Needs Verification', $user->needs_verification ? '✅ TRUE' : '❌ FALSE');
    printf("%-30s: %s\n", 'Registration Complete', $user->registration_complete ? '✅ TRUE' : '❌ FALSE');
    printf("%-30s: %s\n", 'Registration Step', $user->registration_step ?? 'NULL');
    
    echo "\n📋 TO MAKE USER UNVERIFIED:\n";
    echo "==========================\n";
    echo "The following fields need to be updated:\n\n";
    
    $updates = [];
    
    if ($user->email_verified_at) {
        echo "• email_verified_at: Set to NULL (currently: {$user->email_verified_at})\n";
        $updates['email_verified_at'] = null;
    }
    
    if ($user->verified) {
        echo "• verified: Set to FALSE (currently: TRUE)\n";
        $updates['verified'] = false;
    }
    
    if ($user->tenant_verified) {
        echo "• tenant_verified: Set to FALSE (currently: TRUE)\n";
        $updates['tenant_verified'] = false;
    }
    
    if ($user->is_verified_for_existing) {
        echo "• is_verified_for_existing: Set to FALSE (currently: TRUE)\n";
        $updates['is_verified_for_existing'] = false;
    }
    
    if (!$user->needs_verification) {
        echo "• needs_verification: Set to TRUE (currently: FALSE)\n";
        $updates['needs_verification'] = true;
    }
    
    if ($user->registration_complete) {
        echo "• registration_complete: Set to FALSE (currently: TRUE)\n";
        $updates['registration_complete'] = false;
    }
    
    // Optionally reset registration step to force re-verification
    if ($user->registration_step && $user->registration_step >= 5) {
        echo "• registration_step: Reset to 4 (currently: {$user->registration_step})\n";
        $updates['registration_step'] = 4;
    }
    
    if (empty($updates)) {
        echo "✅ User is already in an unverified state!\n";
    } else {
        echo "\n⚠️  WARNING: This will require the user to go through verification again!\n";
        echo "💡 Ready to apply these changes? The update SQL would be:\n\n";
        
        $updateStr = [];
        foreach ($updates as $field => $value) {
            if ($value === null) {
                $updateStr[] = "$field = NULL";
            } elseif (is_bool($value)) {
                $updateStr[] = "$field = " . ($value ? '1' : '0');
            } else {
                $updateStr[] = "$field = '$value'";
            }
        }
        
        echo "UPDATE users SET " . implode(', ', $updateStr) . " WHERE email = 'greggrant3760@gmail.com';\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}