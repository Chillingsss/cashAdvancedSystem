let allRequests = [];

document.addEventListener("DOMContentLoaded", function () {
	fetchBookkeeperRequests();
	// Filter and search event listeners
	const dateFilter = document.getElementById("dateFilter");
	const startDate = document.getElementById("startDate");
	const endDate = document.getElementById("endDate");
	const searchInput = document.getElementById("searchInput");
	const customDateRange = document.getElementById("customDateRange");

	if (dateFilter) {
		dateFilter.addEventListener("change", function () {
			customDateRange.classList.toggle("hidden", this.value !== "custom");
			applyFiltersAndRender();
		});
	}
	if (startDate) startDate.addEventListener("change", applyFiltersAndRender);
	if (endDate) endDate.addEventListener("change", applyFiltersAndRender);
	if (searchInput) searchInput.addEventListener("input", applyFiltersAndRender);
});

function fetchBookkeeperRequests() {
	const formData = new FormData();
	formData.append("operation", "getRequestCash");

	axios
		.post("http://localhost/cashAdvancedSystem/php/bookkeeper.php", formData)
		.then((response) => {
			let requests = response.data;
			if (typeof requests === "string") {
				try {
					requests = JSON.parse(requests);
				} catch (e) {
					requests = [];
				}
			}
			allRequests = requests;
			applyFiltersAndRender();
			updateDashboardStats(requests);
		})
		.catch((error) => {
			console.error("Error fetching requests:", error);
		});
}

function applyFiltersAndRender() {
	let filtered = [...allRequests];

	// Date filter
	const dateFilter = document.getElementById("dateFilter").value;
	const today = new Date();
	let start, end;

	if (dateFilter === "today") {
		start = new Date();
		start.setHours(0, 0, 0, 0);
		end = new Date();
		end.setHours(23, 59, 59, 999);
		filtered = filtered.filter((req) => {
			const reqDate = new Date(req.reqS_datetime);
			return reqDate >= start && reqDate <= end;
		});
	} else if (dateFilter === "week") {
		const now = new Date();
		const first = now.getDate() - now.getDay();
		start = new Date(now.setDate(first));
		start.setHours(0, 0, 0, 0);
		end = new Date(now.setDate(first + 6));
		end.setHours(23, 59, 59, 999);
		filtered = filtered.filter((req) => {
			const reqDate = new Date(req.reqS_datetime);
			return reqDate >= start && reqDate <= end;
		});
	} else if (dateFilter === "month") {
		start = new Date(today.getFullYear(), today.getMonth(), 1);
		end = new Date(
			today.getFullYear(),
			today.getMonth() + 1,
			0,
			23,
			59,
			59,
			999
		);
		filtered = filtered.filter((req) => {
			const reqDate = new Date(req.reqS_datetime);
			return reqDate >= start && reqDate <= end;
		});
	} else if (dateFilter === "custom") {
		const startDate = document.getElementById("startDate").value;
		const endDate = document.getElementById("endDate").value;
		if (startDate && endDate) {
			start = new Date(startDate + "T00:00:00");
			end = new Date(endDate + "T23:59:59");
			filtered = filtered.filter((req) => {
				const reqDate = new Date(req.reqS_datetime);
				return reqDate >= start && reqDate <= end;
			});
		}
	}

	// Search filter
	const search = document
		.getElementById("searchInput")
		.value.trim()
		.toLowerCase();
	if (search) {
		filtered = filtered.filter((req) => {
			const fullName = (
				req.user_firstname +
				" " +
				req.user_lastname
			).toLowerCase();
			const purpose = req.req_purpose ? req.req_purpose.toLowerCase() : "";
			const desc = req.req_desc ? req.req_desc.toLowerCase() : "";
			const budget = req.req_budget ? req.req_budget.toString() : "";
			const rawDate = req.reqS_datetime ? req.reqS_datetime.toLowerCase() : "";
			const formattedDate = formatDate(req.reqS_datetime).toLowerCase();

			return (
				fullName.includes(search) ||
				purpose.includes(search) ||
				desc.includes(search) ||
				budget.includes(search) ||
				rawDate.includes(search) ||
				formattedDate.includes(search)
			);
		});
	}

	renderBookkeeperRequests(filtered);
	updateDashboardStats(filtered);
}

function renderBookkeeperRequests(requests) {
	const container = document.getElementById("bookkeeperRequestsContainer");
	container.innerHTML = "";

	if (!requests || requests.length === 0) {
		container.innerHTML = "<div class='text-gray-500'>No requests found.</div>";
		return;
	}

	requests.forEach((req) => {
		const statusColor = getStatusColor(req.statusR_name);
		const isPending = req.statusR_name.toLowerCase() === "pending";
		const isApproved = req.statusR_name.toLowerCase() === "approved";
		const card = `
  <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm p-6 flex flex-col gap-3 transition hover:shadow-lg">
    <div class="flex items-center justify-between mb-2">
      <span class="font-semibold text-lg text-primary">${req.req_purpose}</span>
      <span class="px-3 py-1 rounded-full text-xs font-medium border ${statusColor}">
        ${req.statusR_name}
      </span>
    </div>
    <div class="text-gray-500 dark:text-gray-300 mb-2 text-sm">${
			req.req_desc
		}</div>
    <div class="text-green-600 font-bold text-xl mb-1 tracking-wide">₱${Number(
			req.req_budget
		).toLocaleString()}</div>
    <div class="flex justify-between items-center mt-2 text-xs text-gray-400">
      <span>By: <span class="font-medium text-gray-700 dark:text-gray-200">${
				req.user_firstname
			} ${req.user_lastname}</span></span>
      <span>${formatDate(req.reqS_datetime)}</span>
    </div>
    ${
			isApproved
				? `<div class=\"flex gap-2 mt-4\"><button class=\"complete-btn flex-1 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition font-medium py-2 rounded-lg\" data-id=\"${req.req_id}\">Complete</button></div>`
				: ""
		}
  </div>
`;
		container.innerHTML += card;
	});

	// Add event listeners for Complete buttons
	document.querySelectorAll(".complete-btn").forEach((btn) => {
		btn.addEventListener("click", function () {
			handleRequestAction(this.dataset.id, "complete");
		});
	});
}

function getStatusColor(status) {
	switch (status.toLowerCase()) {
		case "pending":
			return "border-yellow-300 bg-yellow-50 text-yellow-800";
		case "approved":
			return "border-green-300 bg-green-50 text-green-800";
		case "rejected":
			return "border-red-300 bg-red-50 text-red-800";
		case "completed":
			return "border-blue-300 bg-blue-50 text-blue-800";
		default:
			return "border-gray-300 bg-gray-50 text-gray-800";
	}
}

function formatDate(dateString) {
	const date = new Date(dateString);
	return date.toLocaleString("en-PH", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function showToast(message, type = "success") {
	const toast = document.getElementById("toast");
	const toastMessage = document.getElementById("toastMessage");
	const icon = toast.querySelector("i");

	// Set message
	toastMessage.textContent = message;

	// Reset classes
	toast.className =
		"fixed bottom-6 right-6 z-50 min-w-[200px] max-w-xs rounded-lg shadow-lg px-6 py-4 flex items-center space-x-3 transition-all duration-300";
	icon.className = "fas";

	// Set type-specific styles
	if (type === "success") {
		toast.classList.add("bg-green-500", "text-white");
		icon.classList.add("fa-check-circle");
	} else if (type === "error") {
		toast.classList.add("bg-red-500", "text-white");
		icon.classList.add("fa-exclamation-circle");
	} else {
		toast.classList.add("bg-gray-800", "text-white");
		icon.classList.add("fa-info-circle");
	}

	// Show toast
	toast.classList.remove("hidden");

	// Hide after 3 seconds
	setTimeout(() => {
		toast.classList.add("hidden");
	}, 3000);
}

function handleRequestAction(requestId, action) {
	let operation = "";
	if (action === "complete") {
		operation = "completeRequest";
	} else {
		return; // Only complete is supported for bookkeeper
	}
	const formData = new FormData();
	formData.append("operation", operation);
	formData.append("json", JSON.stringify({ req_id: requestId }));

	const completeBtn = document.querySelector(
		`.complete-btn[data-id='${requestId}']`
	);
	if (completeBtn) completeBtn.disabled = true;

	axios
		.post("http://localhost/cashAdvancedSystem/php/bookkeeper.php", formData)
		.then((response) => {
			if (response.data && response.data.success) {
				showToast("Request completed successfully!", "success");
				fetchBookkeeperRequests();
			} else {
				showToast(
					response.data.error || "Failed to complete request.",
					"error"
				);
				if (completeBtn) completeBtn.disabled = false;
			}
		})
		.catch((error) => {
			showToast("An error occurred. Please try again.", "error");
			if (completeBtn) completeBtn.disabled = false;
		});
}

function updateDashboardStats(requests) {
	let pending = 0,
		approved = 0,
		completed = 0,
		totalAdvanced = 0;
	requests.forEach((req) => {
		const status = req.statusR_name.toLowerCase();
		if (status === "pending") pending++;
		if (status === "approved") {
			approved++;
			totalAdvanced += Number(req.req_budget);
		}
		if (status === "completed") {
			completed++;
			totalAdvanced += Number(req.req_budget);
		}
	});
	document.getElementById("pendingRequestsCount").textContent = pending;
	document.getElementById("approvedRequestsCount").textContent = approved;
	document.getElementById("completedCount").textContent = completed;
	document.getElementById("totalAdvanced").textContent =
		"₱" + totalAdvanced.toLocaleString();
}
