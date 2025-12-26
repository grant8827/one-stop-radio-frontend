<?php
require_once __DIR__ . '/rentalhist-backend/vendor/autoload.php';

use Illuminate\Database\Capsule\Manager as Capsule;
use Dotenv\Dotenv;

// Load environment variables
$dotenv = Dotenv::createImmutable(__DIR__ . '/rentalhist-backend');
$dotenv->load();

// Set up database connection
$capsule = new Capsule;
$capsule->addConnection([
    'driver' => 'mysql',
    'host' => $_ENV['DB_HOST'],
    'database' => $_ENV['DB_DATABASE'],
    'username' => $_ENV['DB_USERNAME'],
    'password' => $_ENV['DB_PASSWORD'],
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => '',
]);

$capsule->setAsGlobal();
$capsule->bootEloquent();

try {
    // Find the user by email
    $email = 'greggrant3760@gmail.com';
    $user = Capsule::table('users')->where('email', $email)->first();
    
    if (!$user) {
        echo "❌ User with email '$email' not found.\n";
        exit(1);
    }
    
    echo "📧 User Found: {$user->email}\n";
    echo "👤 User ID: {$user->id}\n";
    echo "📅 Created: {$user->created_at}\n";
    echo "\n🔍 VERIFICATION STATUS:\n";
    echo "=====================\n";
    
    // Check all verification-related fields
    $verificationFields = [
        'email_verified_at' => 'Email Verified At',
        'verified' => 'General Verified',
        'tenant_verified' => 'Tenant Verified', 
        'is_verified_for_existing' => 'Verified for Existing',
        'needs_verification' => 'Needs Verification',
        'registration_complete' => 'Registration Complete',
        'registration_step' => 'Registration Step'
    ];
    
    foreach ($verificationFields as $field => $label) {
        $value = $user->$field ?? 'NULL';
        
        // Format boolean values
        if (is_numeric($value) && ($value == 0 || $value == 1)) {
            $value = $value ? '✅ TRUE' : '❌ FALSE';
        }
        
        echo sprintf("%-25s: %s\n", $label, $value);
    }
    
    echo "\n📋 STEPS TO MAKE USER UNVERIFIED:\n";
    echo "================================\n";
    echo "The following fields should be updated:\n\n";
    
    if ($user->email_verified_at) {
        echo "• email_verified_at: Set to NULL (currently: {$user->email_verified_at})\n";
    }
    
    if ($user->verified == 1) {
        echo "• verified: Set to FALSE (currently: TRUE)\n";
    }
    
    if ($user->tenant_verified == 1) {
        echo "• tenant_verified: Set to FALSE (currently: TRUE)\n";
    }
    
    if ($user->is_verified_for_existing == 1) {
        echo "• is_verified_for_existing: Set to FALSE (currently: TRUE)\n";
    }
    
    if ($user->needs_verification == 0) {
        echo "• needs_verification: Set to TRUE (currently: FALSE)\n";
    }
    
    if ($user->registration_complete == 1) {
        echo "• registration_complete: Set to FALSE (currently: TRUE)\n";
    }
    
    echo "\n⚠️  WARNING: This will require the user to go through verification again!\n";
    echo "💡 Do you want to proceed with making this user unverified? (y/N): ";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}