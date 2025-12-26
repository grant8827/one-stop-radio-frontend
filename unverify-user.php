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
    $email = 'greggrant3760@gmail.com';
    
    // Find the user
    $user = App\Models\User::where('email', $email)->first();
    
    if (!$user) {
        echo "❌ User with email '$email' not found.\n";
        exit(1);
    }
    
    echo "📧 Found User: {$user->email} (ID: {$user->id})\n";
    echo "\n🔍 CURRENT STATUS:\n";
    echo "==================\n";
    
    // Show current verification status
    printf("Email Verified At: %s\n", $user->email_verified_at ?? 'NULL');
    printf("General Verified: %s\n", $user->verified ? 'TRUE' : 'FALSE');
    printf("Tenant Verified: %s\n", $user->tenant_verified ? 'TRUE' : 'FALSE');
    printf("Verified for Existing: %s\n", $user->is_verified_for_existing ? 'TRUE' : 'FALSE');
    printf("Needs Verification: %s\n", $user->needs_verification ? 'TRUE' : 'FALSE');
    printf("Registration Complete: %s\n", $user->registration_complete ? 'TRUE' : 'FALSE');
    printf("Registration Step: %s\n", $user->registration_step ?? 'NULL');
    
    echo "\n📝 MAKING USER UNVERIFIED...\n";
    echo "============================\n";
    
    // Update the user to unverified state
    $updates = [
        'email_verified_at' => null,
        'verified' => false,
        'tenant_verified' => false, 
        'is_verified_for_existing' => false,
        'needs_verification' => true,
        'registration_complete' => false,
        'registration_step' => 4  // Reset to step 4 to force verification
    ];
    
    // Apply updates
    $user->update($updates);
    
    // Reload the user to show updated values
    $user = $user->fresh();
    
    echo "✅ User verification status updated successfully!\n\n";
    echo "🔍 UPDATED STATUS:\n";
    echo "==================\n";
    
    printf("Email Verified At: %s\n", $user->email_verified_at ?? 'NULL');
    printf("General Verified: %s\n", $user->verified ? 'TRUE' : 'FALSE');
    printf("Tenant Verified: %s\n", $user->tenant_verified ? 'TRUE' : 'FALSE');
    printf("Verified for Existing: %s\n", $user->is_verified_for_existing ? 'TRUE' : 'FALSE');
    printf("Needs Verification: %s\n", $user->needs_verification ? 'TRUE' : 'FALSE');
    printf("Registration Complete: %s\n", $user->registration_complete ? 'TRUE' : 'FALSE');
    printf("Registration Step: %s\n", $user->registration_step ?? 'NULL');
    
    echo "\n🔄 WHAT THIS MEANS:\n";
    echo "==================\n";
    echo "• User will need to complete verification process again\n";
    echo "• User will be prompted for renter history questions\n";
    echo "• Registration will be considered incomplete\n";
    echo "• Email verification will be required again\n";
    echo "• User is now in 'needs verification' state\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}