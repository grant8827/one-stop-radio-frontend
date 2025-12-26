<?php

// Change to the Laravel directory
chdir(__DIR__ . '/rentalhist-backend');

// Include Laravel's bootstrap
require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';

// Boot the application
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Hash;

try {
    $email = 'greggrant3760@gmail.com';
    
    // Find the user
    $user = App\Models\User::where('email', $email)->first();
    
    if (!$user) {
        echo "❌ User with email '$email' not found.\n";
        exit(1);
    }
    
    echo "📧 User Found: {$user->email} (ID: {$user->id})\n";
    echo "📅 Created: {$user->created_at}\n\n";
    
    echo "🔐 AUTHENTICATION DIAGNOSIS:\n";
    echo "============================\n";
    
    // Check if user has a password set
    if (!$user->password) {
        echo "❌ CRITICAL: User has no password set!\n";
        echo "   This will prevent login completely.\n\n";
        
        // Set a default password
        echo "💡 Do you want to set a password for this user? (y/N): ";
        $handle = fopen("php://stdin", "r");
        $line = fgets($handle);
        if (trim($line) === 'y' || trim($line) === 'Y') {
            echo "Enter new password: ";
            $password = trim(fgets($handle));
            if ($password) {
                $user->password = Hash::make($password);
                $user->save();
                echo "✅ Password set successfully!\n";
            }
        }
        fclose($handle);
    } else {
        echo "✅ Password is set (hash exists)\n";
        
        // Test password verification
        echo "🔑 Testing password verification...\n";
        echo "   Enter password to test (or press Enter to skip): ";
        
        // Read from stdin
        $handle = fopen("php://stdin", "r");
        $testPassword = trim(fgets($handle));
        fclose($handle);
        
        if ($testPassword) {
            if (Hash::check($testPassword, $user->password)) {
                echo "✅ Password verification: PASSED\n";
            } else {
                echo "❌ Password verification: FAILED\n";
                echo "   The password you entered doesn't match the stored hash.\n";
            }
        } else {
            echo "⏭️  Password test skipped\n";
        }
    }
    
    echo "\n🔍 ACCOUNT STATUS:\n";
    echo "==================\n";
    
    // Check verification status
    printf("%-25s: %s\n", 'Email Verified', $user->email_verified_at ? "✅ YES" : "❌ NO");
    printf("%-25s: %s\n", 'General Verified', $user->verified ? "✅ YES" : "❌ NO");
    printf("%-25s: %s\n", 'Registration Complete', $user->registration_complete ? "✅ YES" : "❌ NO");
    printf("%-25s: %s\n", 'Registration Step', $user->registration_step ?? 'NULL');
    printf("%-25s: %s\n", 'Last Active', $user->last_active ?? 'Never');
    printf("%-25s: %s\n", 'Logged Off At', $user->logged_off_at ?? 'Never');
    
    // Check for account locks/suspensions (if such fields exist)
    $suspicionFields = ['suspended', 'locked', 'banned', 'disabled', 'active'];
    foreach ($suspicionFields as $field) {
        if (isset($user->$field)) {
            printf("%-25s: %s\n", ucfirst($field), $user->$field ? "✅ YES" : "❌ NO");
        }
    }
    
    echo "\n🚨 POTENTIAL LOGIN BLOCKERS:\n";
    echo "============================\n";
    
    $blockers = [];
    
    if (!$user->password) {
        $blockers[] = "No password set";
    }
    
    if (!$user->email_verified_at && $user->needs_verification) {
        $blockers[] = "Email not verified and verification required";
    }
    
    // Check if there are any obvious login prevention mechanisms
    if (isset($user->suspended) && $user->suspended) {
        $blockers[] = "Account suspended";
    }
    
    if (isset($user->locked) && $user->locked) {
        $blockers[] = "Account locked";
    }
    
    if (isset($user->active) && !$user->active) {
        $blockers[] = "Account inactive";
    }
    
    if (empty($blockers)) {
        echo "✅ No obvious login blockers found!\n";
        echo "\n💡 LOGIN TROUBLESHOOTING STEPS:\n";
        echo "===============================\n";
        echo "1. ✅ Verify password is correct\n";
        echo "2. ✅ Check frontend login form is sending correct data\n";
        echo "3. ✅ Test API endpoint directly (see test commands below)\n";
        echo "4. ✅ Check browser console for JavaScript errors\n";
        echo "5. ✅ Verify API URL is correct in frontend\n";
        
        echo "\n🧪 TEST COMMANDS:\n";
        echo "================\n";
        echo "curl -X POST http://127.0.0.1:8000/api/login \\\n";
        echo "  -H \"Content-Type: application/json\" \\\n";
        echo "  -H \"Accept: application/json\" \\\n";
        echo "  -d '{\"email\":\"$email\",\"password\":\"YOUR_PASSWORD\"}'\n";
    } else {
        echo "❌ Found potential login blockers:\n";
        foreach ($blockers as $blocker) {
            echo "   • $blocker\n";
        }
    }
    
    echo "\n📝 USER DETAILS SUMMARY:\n";
    echo "========================\n";
    echo "User ID: {$user->id}\n";
    echo "Email: {$user->email}\n";
    echo "Name: {$user->first_name} {$user->last_name}\n";
    echo "Username: {$user->username}\n";
    echo "Role: {$user->who_am_i}\n";
    echo "Created: {$user->created_at}\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}