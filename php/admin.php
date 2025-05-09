<?php
include "headers.php";

class Admin {
  function login($json)
  {
      include "connection.php";
  
      $json = json_decode($json, true);

      $sql = "SELECT a.user_id, a.user_firstname, a.user_lastname, a.user_email, a.user_username, a.user_password, b.userL_desc FROM tbluser a
              INNER JOIN tbluserlevel b ON a.user_userLevel = b.userL_id
              WHERE BINARY a.user_username = :username";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':username', $json['username']);
      $stmt->execute();
  
      if ($stmt->rowCount() > 0) {
          $user = $stmt->fetch(PDO::FETCH_ASSOC);
          if (password_verify($json['password'], $user['user_password'])) {
              return json_encode([
                  'user_id' => $user['user_id'],
                  'user_firstname' => $user['user_firstname'],
                  'user_lastname' => $user['user_lastname'],
                  'user_email' => $user['user_email'],
                  'user_username' => $user['user_username'],
                  'user_userLevelDesc' => $user['userL_desc']
              ]);
          }
      }
      return json_encode(null);
  }

  function getUsers()
  {
    include "connection.php";

    try {
        $sql = "SELECT a.user_id, a.user_firstname, a.user_lastname, a.user_contactNumber, a.user_address, a.user_email, a.user_username, a.user_status, b.userL_id, b.userL_name FROM tbluser a
                INNER JOIN tbluserlevel b ON a.user_userLevel = b.userL_id";
        $stmt = $conn->prepare($sql);
        $stmt->execute();

        if ($stmt->rowCount() > 0) {
            $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return json_encode($users);
        }
        return json_encode([]); // Return empty array instead of null
    } catch (PDOException $e) {
        error_log("Database error: " . $e->getMessage());
        return json_encode(['error' => 'Database error occurred']);
    }
  }

  function getUserLevel()
  {
    try {
      include "connection.php";

      $sql = "SELECT * FROM tbluserlevel";
      $stmt = $conn->prepare($sql);
      $stmt->execute();

      if ($stmt->rowCount() > 0) {
        $userLevels = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return json_encode($userLevels);
      }
      return json_encode([]);
    } catch (PDOException $e) {
      error_log("Database error in getUserLevel: " . $e->getMessage());
      return json_encode(['error' => 'Database error occurred']);
    }
  }

  function addUser($json)
  {
    try {
      include "connection.php";

      $json = json_decode($json, true);

      // Hash the password
      $hashedPassword = password_hash($json['password'], PASSWORD_DEFAULT);

      $sql = "INSERT INTO tbluser (user_firstname, user_lastname, user_contactNumber, user_address, user_email, user_username, user_password, user_userLevel, user_status) 
              VALUES (:firstname, :lastname, :contactNumber, :address, :email, :username, :password, :userLevel, :status)";
      
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':firstname', $json['firstname']);
      $stmt->bindParam(':lastname', $json['lastname']);
      $stmt->bindParam(':contactNumber', $json['contactNumber']);
      $stmt->bindParam(':address', $json['address']);
      $stmt->bindParam(':email', $json['email']);
      $stmt->bindParam(':username', $json['username']);
      $stmt->bindParam(':password', $hashedPassword);
      $stmt->bindParam(':userLevel', $json['userLevel']);
      $stmt->bindParam(':status', $json['status']);
      if ($stmt->execute()) {
        return json_encode(['success' => true]);
      } else {
        return json_encode(['error' => 'Failed to add user']);
      }
    } catch (PDOException $e) {
      error_log("Database error in addUser: " . $e->getMessage());
      return json_encode(['error' => 'Database error occurred']);
    }
  }

  function editUser($json)
  {
    try {
      include "connection.php";

      $json = json_decode($json, true);

      $sql = "UPDATE tbluser SET user_firstname = :firstname, user_lastname = :lastname, user_contactNumber = :contactNumber, user_address = :address, user_email = :email, user_username = :username, user_userLevel = :userLevel, user_status = :status WHERE user_id = :userId";

      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':firstname', $json['firstname']);
      $stmt->bindParam(':lastname', $json['lastname']);
      $stmt->bindParam(':contactNumber', $json['contactNumber']);
      $stmt->bindParam(':address', $json['address']);
      $stmt->bindParam(':email', $json['email']);
      $stmt->bindParam(':username', $json['username']);
      $stmt->bindParam(':userLevel', $json['userLevel']);
      $stmt->bindParam(':status', $json['status']);
      $stmt->bindParam(':userId', $json['userId']);

      if ($stmt->execute()) {
        return json_encode(['success' => true]);
      } else {
        return json_encode(['error' => 'Failed to update user']);
      }
    } catch (PDOException $e) {
      error_log("Database error in editUser: " . $e->getMessage());
      return json_encode(['error' => 'Database error occurred']);
    }
  }

  function getRequestCash()
  {
      include "connection.php";

      try {
          // This query fetches only the latest reqS_id (status) for each reqS_reqId (request)
          $sql = "SELECT 
                      a.req_id, 
                      a.req_userId, 
                      a.req_purpose, 
                      a.req_desc,
                      a.req_budget, 
                      a.req_cashMethodId,
                      c.statusR_name,
                      b.reqS_datetime,
                      d.user_firstname,
                      d.user_lastname
                  FROM tblrequest a
                  INNER JOIN (
                      SELECT reqS_reqId, MAX(reqS_id) as max_reqS_id
                      FROM tblrequeststatus
                      GROUP BY reqS_reqId
                  ) latest_status ON a.req_id = latest_status.reqS_reqId
                  INNER JOIN tblrequeststatus b ON b.reqS_id = latest_status.max_reqS_id
                  INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
                  INNER JOIN tbluser d ON a.req_userId = d.user_id
                  ORDER BY a.req_datetime DESC";

          $stmt = $conn->prepare($sql);
          $stmt->execute();
          
          return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

      } catch (PDOException $e) {
          error_log("Database error in getRequestCash: " . $e->getMessage());
          return json_encode([]);
      }
  }

  function approveRequest($json) {
    include "connection.php";
    $json = json_decode($json, true);
    try {
        $approvedStatusId = 19; // adjust if needed
        $sql = "INSERT INTO tblrequeststatus (reqS_reqId, reqS_statusId, reqS_datetime) VALUES (:reqId, :statusId, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':reqId', $json['req_id']);
        $stmt->bindParam(':statusId', $approvedStatusId);
        if ($stmt->execute()) {
            return json_encode(['success' => true]);
        } else {
            return json_encode(['error' => 'Failed to approve request']);
        }
    } catch (PDOException $e) {
        error_log("Database error in approveRequest: " . $e->getMessage());
        return json_encode(['error' => 'Database error occurred']);
    }
  }

  function rejectRequest($json) {
    include "connection.php";
    $json = json_decode($json, true);
    try {
        $rejectedStatusId = 16; // adjust if needed
        $sql = "INSERT INTO tblrequeststatus (reqS_reqId, reqS_statusId, reqS_datetime) VALUES (:reqId, :statusId, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':reqId', $json['req_id']);
        $stmt->bindParam(':statusId', $rejectedStatusId);
        if ($stmt->execute()) {
            return json_encode(['success' => true]);
        } else {
            return json_encode(['error' => 'Failed to reject request']);
        }
    } catch (PDOException $e) {
        error_log("Database error in rejectRequest: " . $e->getMessage());
        return json_encode(['error' => 'Database error occurred']);
    }
  }
}

$operation = isset($_POST["operation"]) ? $_POST["operation"] : "0";
$json = isset($_POST["json"]) ? $_POST["json"] : "0";

$admin = new Admin();

switch ($operation) {
  case "login":
    echo $admin->login($json);
    break;
  case "getUsers":
    echo $admin->getUsers();
    break;
  case "getUserLevel":
    echo $admin->getUserLevel();
    break;
  case "addUser":
    echo $admin->addUser($json);
    break;
  case "editUser":
    echo $admin->editUser($json);
    break;
  case "getRequestCash":
    echo $admin->getRequestCash();
    break;
  case "approveRequest":
    echo $admin->approveRequest($json);
    break;
  case "rejectRequest":
    echo $admin->rejectRequest($json);
    break;
  default:
    echo json_encode(['error' => 'Invalid operation']);
    break;
}