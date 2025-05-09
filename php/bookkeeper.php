<?php
include "headers.php";

class Bookkeeper {
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

  function completeRequest($json) {
    include "connection.php";
    $json = json_decode($json, true);
    try {
        $completedStatusId = 18; // adjust to your actual statusR_id for 'Completed'
        $sql = "INSERT INTO tblrequeststatus (reqS_reqId, reqS_statusId, reqS_datetime) VALUES (:reqId, :statusId, NOW())";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(':reqId', $json['req_id']);
        $stmt->bindParam(':statusId', $completedStatusId);
        if ($stmt->execute()) {
            return json_encode(['success' => true]);
        } else {
            return json_encode(['error' => 'Failed to complete request']);
        }
    } catch (PDOException $e) {
        error_log("Database error in completeRequest: " . $e->getMessage());
        return json_encode(['error' => 'Database error occurred']);
    }
  }

}

$operation = isset($_POST["operation"]) ? $_POST["operation"] : "0";
$json = isset($_POST["json"]) ? $_POST["json"] : "0";

$bookkeeper = new Bookkeeper();

switch ($operation) {
  case "getRequestCash":
    echo $bookkeeper->getRequestCash();
    break;
  case "completeRequest":
    echo $bookkeeper->completeRequest($json);
    break;
  default:
    echo json_encode(['error' => 'Invalid operation']);
    break;
}