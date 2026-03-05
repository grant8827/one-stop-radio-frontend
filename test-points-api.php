<?php
/**
 * Direct test of the points API endpoint
 * This simulates what the frontend should receive
 */

// Get the user's auth token from the database
require_once __DIR__ . '/rentalhist-backend/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__ . '/rentalhist-backend');
$dotenv->load();

$db = mysqli_connect(
    $_ENV['DB_HOST'], 
    $_ENV['DB_USERNAME'], 
    $_ENV['DB_PASSWORD'], 
    $_ENV['DB_DATABASE'],
    $_ENV['DB_PORT'] ?? 3306
);

if (!$db) {
    die("Connection failed: " . mysqli_connect_error());
}

echo "=== POINTS API TEST ===\n\n";

// Get the user's auth token
$userId = 45; // grant882788
$tokenQuery = "SELECT token FROM personal_access_tokens WHERE tokenable_id = $userId AND name = 'auth_token' ORDER BY created_at DESC LIMIT 1";
$tokenResult = mysqli_query($db, $tokenQuery);

if (!$tokenResult || mysqli_num_rows($tokenResult) === 0) {
    echo "❌ No auth token found for user $userId\n";
    echo "Creating a test by directly calling the controller...\n\n";
    
    // Direct database query to simulate what controller does
    echo "=== SIMULATING CONTROLLER LOGIC ===\n\n";
    
    // Get user points
    $userPointsQuery = "SELECT * FROM user_points WHERE user_id = $userId";
    $userPointsResult = mysqli_query($db, $userPointsQuery);
    $userPoint = mysqli_fetch_assoc($userPointsResult);
    
    echo "UserPoint data:\n";
    print_r($userPoint);
    echo "\n";
    
    // Get point transactions
    $transactionsQuery = "
        SELECT pt.*, ga.label
        FROM point_transactions pt
        LEFT JOIN gamification_actions ga ON pt.action_id = ga.id
        WHERE pt.user_id = $userId
        ORDER BY pt.created_at DESC
        LIMIT 10
    ";
    $transactionsResult = mysqli_query($db, $transactionsQuery);
    
    echo "Recent transactions:\n";
    while ($transaction = mysqli_fetch_assoc($transactionsResult)) {
        echo sprintf(
            "- %s: %+d points (%s) - Balance after: %d\n",
            $transaction['created_at'],
            $transaction['points'],
            $transaction['description'] ?? $transaction['label'] ?? 'N/A',
            $transaction['balance_after']
        );
    }
    echo "\n";
    
    // Calculate what the API should return
    $transactionsResult = mysqli_query($db, "
        SELECT transaction_type, SUM(points) as total_points
        FROM point_transactions
        WHERE user_id = $userId
        GROUP BY transaction_type
    ");
    
    echo "Totals by type:\n";
    $earnedPoints = 0;
    $spentPoints = 0;
    while ($row = mysqli_fetch_assoc($transactionsResult)) {
        echo "- {$row['transaction_type']}: {$row['total_points']} points\n";
        if ($row['transaction_type'] === 'earn') {
            $earnedPoints = $row['total_points'];
        } else if ($row['transaction_type'] === 'spend') {
            $spentPoints = abs($row['total_points']);
        }
    }
    echo "\n";
    
    // Build the expected API response
    $expectedResponse = [
        'status' => true,
        'data' => [
            'current_balance' => $userPoint['current_balance'] ?? 0,
            'earned_points' => $earnedPoints,
            'spent_points' => $spentPoints,
            'lifetime_points' => $earnedPoints,
            'points_redeemed' => $spentPoints,
            'points_history' => [], // We'll skip this for brevity
            'total_transactions' => 0 // We'll skip counting for brevity
        ],
        'message' => 'Points data retrieved successfully'
    ];
    
    echo "=== EXPECTED API RESPONSE ===\n";
    echo json_encode($expectedResponse, JSON_PRETTY_PRINT);
    echo "\n\n";
    
    exit;
}

$tokenRow = mysqli_fetch_assoc($tokenResult);
$token = $tokenRow['token'];

echo "✅ Found auth token for user $userId\n";
echo "Token (first 20 chars): " . substr($token, 0, 20) . "...\n\n";

// Make actual HTTP request to the API
$apiUrl = 'http://127.0.0.1:8000/api/dashboard/points';

echo "Making request to: $apiUrl\n\n";

$ch = curl_init($apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token,
    'Accept: application/json',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    echo "❌ CURL Error: $curlError\n";
    exit(1);
}

echo "=== API RESPONSE ===\n";
echo "HTTP Status: $httpCode\n\n";

if ($httpCode === 200) {
    $data = json_decode($response, true);
    echo json_encode($data, JSON_PRETTY_PRINT);
    echo "\n\n";
    
    if (isset($data['data']['current_balance'])) {
        echo "✅ SUCCESS: API returned current_balance = " . $data['data']['current_balance'] . "\n";
    } else {
        echo "⚠️  WARNING: Response structure unexpected\n";
    }
} else {
    echo "❌ ERROR: HTTP $httpCode\n";
    echo $response . "\n";
}

mysqli_close($db);
