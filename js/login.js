document.addEventListener("DOMContentLoaded", function () {
	const loginForm = document.getElementById("loginForm");

	loginForm.addEventListener("submit", async function (e) {
		e.preventDefault();

		const username = document.getElementById("username").value;
		const password = document.getElementById("password").value;

		const formData = new FormData();
		formData.append("operation", "login");
		formData.append(
			"json",
			JSON.stringify({
				username: username,
				password: password,
			})
		);

		try {
			const response = await axios.post(
				"http://localhost/cashAdvancedSystem/php/admin.php",
				formData
			);
			const data = response.data;

			if (data) {
				// Store user data in sessionStorage
				sessionStorage.setItem("user", JSON.stringify(data));

				// Redirect based on user level
				switch (data.user_userLevelDesc) {
					case "100.0": // Admin
						window.location.href = "admin/dashboard.html";
						break;
					case "50.0": // Owner
						window.location.href = "owner/dashboard.html";
						break;
					case "0.0": // Bookkeeper
						window.location.href = "bookeeper/dashboard.html";
						break;
					case "10.0": // Employee
						window.location.href = "employee/dashboard.html";
						break;
					default:
						alert("Invalid user level");
				}
			} else {
				alert("Invalid username or password");
			}
		} catch (error) {
			console.error("Login error:", error);
			alert("An error occurred during login. Please try again.");
		}
	});
});
