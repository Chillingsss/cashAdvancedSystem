<?php
include "headers.php";

class Employee {

  function CashMethod()
  {
    include "connection.php";

    $sql = "SELECT * FROM tblcashmethod";
    $stmt = $conn->prepare($sql);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
      $cashMethod = $stmt->fetchAll(PDO::FETCH_ASSOC);
      return json_encode($cashMethod);
    }
    return json_encode([]);
  }

  function statusRequest()
  {
    include "connection.php";

    $sql = "SELECT * FROM tblstatusrequest";
    $stmt = $conn->prepare($sql);
    $stmt->execute();

    if ($stmt->rowCount() > 0) {
      $statusRequest = $stmt->fetchAll(PDO::FETCH_ASSOC);
      return json_encode($statusRequest);
    }
    return json_encode([]);
  }

  function addRequestCash($json)
  {
    include "connection.php";

    $json = json_decode($json, true);

    try {
      $conn->beginTransaction();

      // First, get the status ID for "Pending" status
      $statusSql = "SELECT statusR_id FROM tblstatusrequest WHERE statusR_name = 'Pending' LIMIT 1";
      $statusStmt = $conn->prepare($statusSql);
      $statusStmt->execute();
      $statusResult = $statusStmt->fetch(PDO::FETCH_ASSOC);

      if (!$statusResult) {
        throw new PDOException("Pending status not found in status request table");
      }

      $pendingStatusId = $statusResult['statusR_id'];

      $sql = "INSERT INTO tblrequest (req_userId, req_purpose, req_desc, req_budget, req_cashMethodId, req_datetime ) 
              VALUES (:userId, :purpose, :desc, :budget, :cashMethodId, :datetime)";

      $stmt = $conn->prepare($sql);
      $stmt->bindParam(':userId', $json['userId']);
      $stmt->bindParam(':purpose', $json['purpose']);
      $stmt->bindParam(':desc', $json['desc']);
      $stmt->bindParam(':budget', $json['budget']);
      $stmt->bindParam(':cashMethodId', $json['cashMethodId']);
      $stmt->bindParam(':datetime', $json['datetime']);

      if ($stmt->execute()) {
        $requestId = $conn->lastInsertId();
        
        // Insert into tblrequeststatus with the correct pending status ID
        $statusSql = "INSERT INTO tblrequeststatus (reqS_reqId, reqS_statusId, reqS_datetime) VALUES (:requestId, :statusId, :datetime)";
        $statusStmt = $conn->prepare($statusSql);
        $statusStmt->bindParam(':requestId', $requestId);
        $statusStmt->bindParam(':statusId', $pendingStatusId);
        $statusStmt->bindParam(':datetime', $json['datetime']);

        if ($statusStmt->execute()) {
          $conn->commit();
          return json_encode(['success' => true]);
        }
      }

      $conn->rollBack();
      return json_encode(['error' => 'Failed to add request: ' . implode(" ", $stmt->errorInfo())]);

    } catch (PDOException $e) {
      $conn->rollBack();
      return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }

  function getRequestCash($json)
  {
    include "connection.php";

    try {
        // Decode the JSON input
        $data = json_decode($json, true);
        if (!$data || !isset($data['userId'])) {
            return json_encode(['error' => 'Invalid input data']);
        }

        $sql = "SELECT 
                a.req_id, 
                a.req_userId, 
                a.req_purpose, 
                a.req_desc,
                a.req_budget, 
                a.req_cashMethodId,
                c.statusR_name,
                b.reqS_datetime
                FROM tblrequest a
                INNER JOIN (
                      SELECT reqS_reqId, MAX(reqS_id) as max_reqS_id
                      FROM tblrequeststatus
                      GROUP BY reqS_reqId
                  ) latest_status ON a.req_id = latest_status.reqS_reqId
                  INNER JOIN tblrequeststatus b ON b.reqS_id = latest_status.max_reqS_id
                INNER JOIN tblstatusrequest c ON b.reqS_statusId = c.statusR_id
                WHERE a.req_userId = :userId
                ORDER BY a.req_datetime DESC";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':userId', $data['userId']);
        $stmt->execute();
        
        $requestCash = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return json_encode($requestCash); // This will return [] if no results

    } catch (PDOException $e) {
        return json_encode(['error' => 'Database error occurred: ' . $e->getMessage()]);
    }
  }
}

$operation = isset($_POST["operation"]) ? $_POST["operation"] : "0";
$json = isset($_POST["json"]) ? $_POST["json"] : "0";

$employee = new Employee();

switch ($operation) {
  case "addRequestCash":
    echo $employee->addRequestCash($json);
    break;
  case "CashMethod":
    echo $employee->CashMethod();
    break;
  case "statusRequest":
    echo $employee->statusRequest();
    break;
  case "getRequestCash":
    echo $employee->getRequestCash($json);
    break;
  default:
    echo json_encode(['error' => 'Invalid operation']);
    break;
}