// Year-End Financial Summary JS
let yearlyRequests = [];
let monthlyTotalsChart = null;
let topWorkersChart = null;
let disbursedVsBudgetedChart = null;

document.addEventListener("DOMContentLoaded", function () {
	console.log("Yearly Summary: DOM Content Loaded");
	initYearSelector();
	fetchYearlyData();
});

function initYearSelector() {
	console.log("Yearly Summary: Initializing year selector");
	const yearSelector = document.getElementById("yearSelector");

	if (!yearSelector) {
		console.error("Yearly Summary: Year selector element not found!");
		return;
	}

	// Clear existing options
	yearSelector.innerHTML = "";

	// Add options for last 5 years
	const currentYear = new Date().getFullYear();
	for (let y = currentYear; y >= currentYear - 5; y--) {
		const opt = document.createElement("option");
		opt.value = y;
		opt.textContent = y;
		yearSelector.appendChild(opt);
	}

	// Set current year as default
	yearSelector.value = currentYear;

	// Add event listener for year selection
	yearSelector.addEventListener("change", function () {
		console.log("Yearly Summary: Year changed to", this.value);
		renderYearlySummary();
	});

	console.log("Yearly Summary: Year selector initialized with options");
}

function fetchYearlyData() {
	console.log("Yearly Summary: Fetching data");

	try {
		const formData = new FormData();
		formData.append("operation", "getAllRequestStatusHistory");

		axios
			.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
			.then((response) => {
				console.log("Yearly Summary: Data fetched successfully");
				let requests = response.data;
				console.log("Yearly Summary: Raw response data type:", typeof requests);

				if (typeof requests === "string") {
					try {
						requests = JSON.parse(requests);
						console.log("Yearly Summary: Successfully parsed JSON data");
					} catch (e) {
						console.error("Yearly Summary: Error parsing requests:", e);
						requests = [];
					}
				}

				if (Array.isArray(requests) && requests.length > 0) {
					console.log(`Yearly Summary: Got ${requests.length} request records`);
					yearlyRequests = requests;
				} else {
					console.warn(
						"Yearly Summary: No data received, generating test data"
					);
					yearlyRequests = generateTestData();
				}

				renderYearlySummary();
			})
			.catch((error) => {
				console.error("Yearly Summary: Error fetching yearly data:", error);
				console.warn("Yearly Summary: Using test data due to fetch error");
				yearlyRequests = generateTestData();
				renderYearlySummary();
			});
	} catch (error) {
		console.error(
			"Yearly Summary: Unexpected error in fetchYearlyData:",
			error
		);
		yearlyRequests = generateTestData();
		renderYearlySummary();
	}
}

function generateTestData() {
	console.log("Yearly Summary: Generating test data");
	const currentYear = new Date().getFullYear();
	const testData = [];

	// Names for test data
	const employees = [
		{ firstName: "John", lastName: "Doe" },
		{ firstName: "Jane", lastName: "Smith" },
		{ firstName: "Robert", lastName: "Johnson" },
		{ firstName: "Maria", lastName: "Garcia" },
		{ firstName: "David", lastName: "Brown" },
	];

	// Statuses
	const statuses = ["pending", "approved", "completed", "rejected"];

	// Generate data for the last 2 years
	for (let y = currentYear; y >= currentYear - 1; y--) {
		// For each employee
		employees.forEach((emp, empIndex) => {
			// Generate 5-10 requests per employee per year
			const numRequests = 5 + Math.floor(Math.random() * 6);

			for (let r = 0; r < numRequests; r++) {
				// Random month and day
				const month = Math.floor(Math.random() * 12);
				const day = 1 + Math.floor(Math.random() * 28);
				const reqId = `TEST-${y}-${empIndex}-${r}`;

				// Random budget between 1000 and 10000
				const budget = 1000 + Math.floor(Math.random() * 9000);

				// Create entries for this request with status history
				let numStatusChanges = 1 + Math.floor(Math.random() * 3); // 1-3 status changes

				// Ensure we don't exceed the number of statuses
				numStatusChanges = Math.min(numStatusChanges, statuses.length);

				for (let s = 0; s < numStatusChanges; s++) {
					// Each status change happens a few days after the previous
					const statusDay = day + s * 2;
					const statusDate = new Date(y, month, statusDay);

					testData.push({
						req_id: reqId,
						user_firstname: emp.firstName,
						user_lastname: emp.lastName,
						req_budget: budget.toString(),
						reqS_datetime: statusDate.toISOString(),
						statusR_name: statuses[s], // Status progresses through the array
					});
				}
			}
		});
	}

	console.log(`Yearly Summary: Generated ${testData.length} test records`);
	return testData;
}

function renderYearlySummary() {
	const yearSelector = document.getElementById("yearSelector");
	if (!yearSelector) {
		console.error(
			"Yearly Summary: Year selector not found when rendering summary"
		);
		return;
	}

	const year = parseInt(yearSelector.value);
	console.log(`Yearly Summary: Rendering summary for year ${year}`);

	if (!Array.isArray(yearlyRequests) || yearlyRequests.length === 0) {
		console.warn("Yearly Summary: No request data available");
		// Still update UI with zeros
		updateYearlySummaryCards([]);
		// Render empty charts
		renderEmptyCharts();
		return;
	}

	// Filter for selected year
	const yearRequests = yearlyRequests.filter((req) => {
		try {
			const d = new Date(req.reqS_datetime);
			return d.getFullYear() === year;
		} catch (e) {
			console.error("Yearly Summary: Error parsing date", req.reqS_datetime, e);
			return false;
		}
	});

	console.log(
		`Yearly Summary: Found ${yearRequests.length} requests for year ${year}`
	);

	// Update summary cards
	updateYearlySummaryCards(yearRequests);

	// Render charts
	if (yearRequests.length > 0) {
		renderMonthlyTotals(yearRequests, year);
		renderTopWorkers(yearRequests);
		renderDisbursedVsBudgeted(yearRequests);
	} else {
		renderEmptyCharts();
	}
}

function renderEmptyCharts() {
	console.log("Yearly Summary: Rendering empty charts");
	// Create empty charts
	renderMonthlyTotals([], new Date().getFullYear());
	renderTopWorkers([]);
	renderDisbursedVsBudgeted([]);
}

function updateYearlySummaryCards(yearRequests) {
	console.log("Yearly Summary: Updating summary cards");

	// Create a map to store latest status for each request
	const requestMap = new Map();

	yearRequests.forEach((req) => {
		const reqId = req.req_id;

		// If this request doesn't exist in map, or is newer than existing one, update it
		if (
			!requestMap.has(reqId) ||
			new Date(req.reqS_datetime) >
				new Date(requestMap.get(reqId).reqS_datetime)
		) {
			requestMap.set(reqId, req);
		}
	});

	// Get unique request count
	const totalRequests = requestMap.size;

	// Count completed requests
	let completedCount = 0;
	let totalDisbursed = 0;

	requestMap.forEach((req) => {
		if (req.statusR_name.toLowerCase() === "completed") {
			completedCount++;
			totalDisbursed += Number(req.req_budget || 0);
		}
	});

	// Update UI
	const totalRequestsElement = document.getElementById("yearlyTotalRequests");
	const completedRequestsElement = document.getElementById(
		"yearlyCompletedRequests"
	);
	const totalDisbursedElement = document.getElementById("yearlyTotalDisbursed");

	if (totalRequestsElement) totalRequestsElement.textContent = totalRequests;
	if (completedRequestsElement)
		completedRequestsElement.textContent = completedCount;
	if (totalDisbursedElement)
		totalDisbursedElement.textContent = `₱${totalDisbursed.toLocaleString()}`;

	console.log("Yearly Summary: Summary cards updated", {
		totalRequests,
		completedCount,
		totalDisbursed,
	});
}

function renderMonthlyTotals(yearRequests, year) {
	console.log("Yearly Summary: Rendering monthly totals chart");
	const chartContainer = document.getElementById("monthlyTotalsChart");
	if (!chartContainer) {
		console.error("Yearly Summary: Monthly totals chart container not found");
		return;
	}

	// Group by month
	const monthly = Array.from({ length: 12 }, () => ({
		total: 0,
		approved: 0,
		completed: 0,
		disbursed: 0,
	}));

	// Create a map to organize requests by month and ID
	const monthlyRequestMap = Array.from({ length: 12 }, () => new Map());

	yearRequests.forEach((req) => {
		try {
			const d = new Date(req.reqS_datetime);
			const m = d.getMonth();
			const reqId = req.req_id;

			// Get or create an entry for this request in this month
			const currentEntry = monthlyRequestMap[m].get(reqId) || {
				latestDate: new Date(0),
				status: "",
				budget: 0,
			};

			// Only update if this status change is newer
			const reqDate = new Date(req.reqS_datetime);
			if (reqDate > currentEntry.latestDate) {
				currentEntry.latestDate = reqDate;
				currentEntry.status = req.statusR_name.toLowerCase();
				currentEntry.budget = Number(req.req_budget || 0);

				// Update in the map
				monthlyRequestMap[m].set(reqId, currentEntry);
			}
		} catch (e) {
			console.error(
				"Yearly Summary: Error processing request for monthly chart",
				req,
				e
			);
		}
	});

	// Process the monthly data
	for (let m = 0; m < 12; m++) {
		const monthData = monthlyRequestMap[m];
		monthly[m].total = monthData.size;

		monthData.forEach((entry) => {
			if (entry.status === "approved") {
				monthly[m].approved++;
			}
			if (entry.status === "completed") {
				monthly[m].completed++;
				monthly[m].disbursed += entry.budget;
			}
		});
	}

	const labels = [
		"Jan",
		"Feb",
		"Mar",
		"Apr",
		"May",
		"Jun",
		"Jul",
		"Aug",
		"Sep",
		"Oct",
		"Nov",
		"Dec",
	];

	// Destroy existing chart
	if (monthlyTotalsChart) {
		monthlyTotalsChart.destroy();
	}

	// Create new chart
	monthlyTotalsChart = new Chart(chartContainer.getContext("2d"), {
		type: "bar",
		data: {
			labels,
			datasets: [
				{
					label: "Total Requests",
					data: monthly.map((m) => m.total),
					backgroundColor: "#8B1C23",
					barPercentage: 0.7,
					categoryPercentage: 0.8,
				},
				{
					label: "Approved",
					data: monthly.map((m) => m.approved),
					backgroundColor: "#22C55E",
					barPercentage: 0.7,
					categoryPercentage: 0.8,
				},
				{
					label: "Completed",
					data: monthly.map((m) => m.completed),
					backgroundColor: "#3B82F6",
					barPercentage: 0.7,
					categoryPercentage: 0.8,
				},
				{
					label: "Disbursed (₱)",
					data: monthly.map((m) => m.disbursed),
					backgroundColor: "#F59E0B",
					type: "line",
					tension: 0.3,
					fill: false,
					borderWidth: 3,
					yAxisID: "y1",
				},
			],
		},
		options: {
			maintainAspectRatio: false,
			responsive: true,
			plugins: {
				legend: { position: "top" },
				tooltip: {
					callbacks: {
						label: function (context) {
							if (context.datasetIndex === 3) {
								return `${
									context.dataset.label
								}: ₱${context.raw.toLocaleString()}`;
							}
							return `${context.dataset.label}: ${context.raw}`;
						},
					},
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					title: { display: true, text: "Count" },
				},
				y1: {
					beginAtZero: true,
					position: "right",
					title: { display: true, text: "Disbursed (₱)" },
					grid: { drawOnChartArea: false },
				},
			},
		},
	});

	console.log("Yearly Summary: Monthly totals chart rendered");
}

function renderTopWorkers(yearRequests) {
	console.log("Yearly Summary: Rendering top workers chart");
	const chartContainer = document.getElementById("topWorkersChart");
	if (!chartContainer) {
		console.error("Yearly Summary: Top workers chart container not found");
		return;
	}

	// Get latest status for each request
	const requestMap = new Map();
	yearRequests.forEach((req) => {
		const reqId = req.req_id;
		if (
			!requestMap.has(reqId) ||
			new Date(req.reqS_datetime) >
				new Date(requestMap.get(reqId).reqS_datetime)
		) {
			requestMap.set(reqId, req);
		}
	});

	// Group by worker
	const workerMap = {};

	requestMap.forEach((req) => {
		const key = `${req.user_firstname || "Unknown"} ${
			req.user_lastname || ""
		}`.trim();

		if (!workerMap[key]) {
			workerMap[key] = { count: 0, disbursed: 0 };
		}

		workerMap[key].count++;

		if (req.statusR_name.toLowerCase() === "completed") {
			workerMap[key].disbursed += Number(req.req_budget || 0);
		}
	});

	// Sort and get top 5
	const topWorkers = Object.entries(workerMap)
		.map(([name, data]) => ({ name, ...data }))
		.sort((a, b) => b.count - a.count) // Sort by count instead of disbursed
		.slice(0, 5);

	console.log("Yearly Summary: Top workers data", topWorkers);

	// Handle empty data case
	if (topWorkers.length === 0) {
		topWorkers.push({
			name: "No Data",
			count: 0,
			disbursed: 0,
		});
	}

	// Destroy existing chart
	if (topWorkersChart) {
		topWorkersChart.destroy();
	}

	// Create new chart
	topWorkersChart = new Chart(chartContainer.getContext("2d"), {
		type: "bar",
		data: {
			labels: topWorkers.map((w) => w.name),
			datasets: [
				{
					label: "Total Requests",
					data: topWorkers.map((w) => w.count),
					backgroundColor: "#8B1C23",
					barPercentage: 0.7,
					categoryPercentage: 0.6,
				},
				{
					label: "Disbursed (₱)",
					data: topWorkers.map((w) => w.disbursed),
					backgroundColor: "#22C55E",
					barPercentage: 0.7,
					categoryPercentage: 0.6,
					yAxisID: "y1",
				},
			],
		},
		options: {
			maintainAspectRatio: false,
			responsive: true,
			indexAxis: "y", // Horizontal bars
			plugins: {
				legend: { position: "top" },
				tooltip: {
					callbacks: {
						label: function (context) {
							if (context.datasetIndex === 1) {
								return `${
									context.dataset.label
								}: ₱${context.raw.toLocaleString()}`;
							}
							return `${context.dataset.label}: ${context.raw}`;
						},
					},
				},
			},
			scales: {
				x: { beginAtZero: true },
				y: { beginAtZero: true },
				y1: {
					beginAtZero: true,
					position: "right",
					grid: { drawOnChartArea: false },
				},
			},
		},
	});

	console.log("Yearly Summary: Top workers chart rendered");
}

function renderDisbursedVsBudgeted(yearRequests) {
	console.log("Yearly Summary: Rendering disbursed vs budgeted chart");
	const chartContainer = document.getElementById("disbursedVsBudgetedChart");
	if (!chartContainer) {
		console.error(
			"Yearly Summary: Disbursed vs budgeted chart container not found"
		);
		return;
	}

	// Get latest status for each request
	const requestMap = new Map();
	yearRequests.forEach((req) => {
		const reqId = req.req_id;
		if (
			!requestMap.has(reqId) ||
			new Date(req.reqS_datetime) >
				new Date(requestMap.get(reqId).reqS_datetime)
		) {
			requestMap.set(reqId, req);
		}
	});

	// Calculate totals
	let totalRequested = 0;
	let totalDisbursed = 0;
	let pendingAmount = 0;

	requestMap.forEach((req) => {
		const budget = Number(req.req_budget || 0);
		const status = req.statusR_name.toLowerCase();

		totalRequested += budget;

		if (status === "completed") {
			totalDisbursed += budget;
		} else if (status === "pending" || status === "approved") {
			pendingAmount += budget;
		}
	});

	// Calculate remaining (not requested or rejected)
	const remaining = Math.max(
		0,
		totalRequested - totalDisbursed - pendingAmount
	);

	console.log("Yearly Summary: Budget data", {
		totalRequested,
		totalDisbursed,
		pendingAmount,
		remaining,
	});

	// Destroy existing chart
	if (disbursedVsBudgetedChart) {
		disbursedVsBudgetedChart.destroy();
	}

	// Create new chart
	disbursedVsBudgetedChart = new Chart(chartContainer.getContext("2d"), {
		type: "doughnut",
		data: {
			labels: ["Disbursed", "Pending", "Remaining"],
			datasets: [
				{
					data: [totalDisbursed, pendingAmount, remaining],
					backgroundColor: ["#22C55E", "#F59E0B", "#3B82F6"],
					borderWidth: 1,
					borderColor: "#fff",
					hoverOffset: 12,
				},
			],
		},
		options: {
			maintainAspectRatio: false,
			responsive: true,
			cutout: "65%",
			plugins: {
				legend: {
					display: true,
					position: "bottom",
					labels: {
						boxWidth: 12,
						padding: 15,
					},
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							const value = context.raw;
							const total = context.dataset.data.reduce((a, b) => a + b, 0);
							const percentage = Math.round((value / (total || 1)) * 100);
							return `₱${value.toLocaleString()} (${percentage}%)`;
						},
					},
				},
			},
			animation: { animateRotate: true, duration: 1000 },
			layout: { padding: 20 },
		},
	});

	console.log("Yearly Summary: Disbursed vs budgeted chart rendered");
}
