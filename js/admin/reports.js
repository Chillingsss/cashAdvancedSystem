let allRequests = [];
let approvedRequests = [];
let monthlyTrendChart = null;
let statusDistributionChart = null;

document.addEventListener("DOMContentLoaded", function () {
	// Set default month to current month
	const today = new Date();
	const monthSelector = document.getElementById("monthSelector");
	monthSelector.value = `${today.getFullYear()}-${String(
		today.getMonth() + 1
	).padStart(2, "0")}`;

	// Fetch initial data
	fetchReportData();

	// Add event listener for month selection
	monthSelector.addEventListener("change", fetchReportData);
});

function fetchReportData() {
	const formData = new FormData();
	formData.append("operation", "getAllRequestStatusHistory");

	axios
		.post("http://localhost/cashAdvancedSystem/php/admin.php", formData)
		.then((response) => {
			let requests = response.data;
			if (typeof requests === "string") {
				try {
					requests = JSON.parse(requests);
				} catch (e) {
					console.error("Error parsing all requests:", e);
					requests = [];
				}
			}
			allRequests = Array.isArray(requests) ? requests : [];
			updateReportData();
		})
		.catch((error) => {
			console.error("Error fetching requests:", error);
			allRequests = [];
			updateReportData();
		});
}

function updateReportData() {
	const selectedMonth = document.getElementById("monthSelector").value;
	const [year, month] = selectedMonth.split("-");

	// Filter requests for selected month
	const monthStart = new Date(year, month - 1, 1);
	const monthEnd = new Date(year, month, 0);

	const monthRequests = Array.isArray(allRequests)
		? allRequests.filter((req) => {
				const reqDate = new Date(req.reqS_datetime);
				return reqDate >= monthStart && reqDate <= monthEnd;
		  })
		: [];

	// Group by req_id and get the latest status for each request
	const latestRequestsMap = {};
	monthRequests.forEach((req) => {
		const id = req.req_id;
		if (
			!latestRequestsMap[id] ||
			new Date(req.reqS_datetime) >
				new Date(latestRequestsMap[id].reqS_datetime)
		) {
			latestRequestsMap[id] = req;
		}
	});
	const latestRequests = Object.values(latestRequestsMap);

	// Update summary cards using both metrics
	updateSummaryCards(latestRequests, monthRequests);

	// Update charts (can use all status changes or just latest, depending on your preference)
	updateCharts(monthRequests);

	// Update detailed table (show all status changes for the month)
	updateDetailedTable(monthRequests);
}

function updateSummaryCards(latestRequests, monthRequests) {
	// 1. Total Requests (unique req_id for the month)
	const uniqueRequestIds = new Set(monthRequests.map((req) => req.req_id));
	const totalRequests = uniqueRequestIds.size;

	// 2. Approved Requests (all records with status 'approved')
	const approvedRequests = monthRequests.filter(
		(req) => req.statusR_name.toLowerCase() === "approved"
	).length;

	// 3. Total Disbursed (sum of all records with status 'completed')
	const totalDisbursedCompleted = monthRequests
		.filter((req) => req.statusR_name.toLowerCase() === "completed")
		.reduce((sum, req) => sum + Number(req.req_budget || 0), 0);

	// 4. Previous month's completed requests and disbursed
	const previousMonth = new Date(
		document.getElementById("monthSelector").value
	);
	previousMonth.setMonth(previousMonth.getMonth() - 1);
	const prevMonthStart = new Date(
		previousMonth.getFullYear(),
		previousMonth.getMonth(),
		1
	);
	const prevMonthEnd = new Date(
		previousMonth.getFullYear(),
		previousMonth.getMonth() + 1,
		0
	);

	const prevMonthRequests = Array.isArray(allRequests)
		? allRequests.filter((req) => {
				const reqDate = new Date(req.reqS_datetime);
				return reqDate >= prevMonthStart && reqDate <= prevMonthEnd;
		  })
		: [];

	const prevMonthDisbursedCompleted = prevMonthRequests
		.filter((req) => req.statusR_name.toLowerCase() === "completed")
		.reduce((sum, req) => sum + Number(req.req_budget || 0), 0);

	// 5. Calculate previous month's percent change (compared to the month before it)
	const twoMonthsAgo = new Date(document.getElementById("monthSelector").value);
	twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
	const twoMonthsAgoStart = new Date(
		twoMonthsAgo.getFullYear(),
		twoMonthsAgo.getMonth(),
		1
	);
	const twoMonthsAgoEnd = new Date(
		twoMonthsAgo.getFullYear(),
		twoMonthsAgo.getMonth() + 1,
		0
	);

	const twoMonthsAgoRequests = Array.isArray(allRequests)
		? allRequests.filter((req) => {
				const reqDate = new Date(req.reqS_datetime);
				return reqDate >= twoMonthsAgoStart && reqDate <= twoMonthsAgoEnd;
		  })
		: [];
	const twoMonthsAgoDisbursed = twoMonthsAgoRequests
		.filter((req) => req.statusR_name.toLowerCase() === "completed")
		.reduce((sum, req) => sum + Number(req.req_budget || 0), 0);

	let prevMonthlyChange;
	if (twoMonthsAgoDisbursed === 0 && prevMonthDisbursedCompleted === 0) {
		prevMonthlyChange = "No Data";
	} else if (twoMonthsAgoDisbursed === 0) {
		prevMonthlyChange = "100%";
	} else {
		prevMonthlyChange =
			(
				((prevMonthDisbursedCompleted - twoMonthsAgoDisbursed) /
					twoMonthsAgoDisbursed) *
				100
			).toFixed(1) + "%";
	}

	// 6. Monthly Change (current month vs previous month)
	let monthlyChange;
	if (prevMonthDisbursedCompleted === 0 && totalDisbursedCompleted === 0) {
		monthlyChange = "No Data";
	} else if (prevMonthDisbursedCompleted === 0) {
		monthlyChange = "100%";
	} else {
		monthlyChange =
			(
				((totalDisbursedCompleted - prevMonthDisbursedCompleted) /
					prevMonthDisbursedCompleted) *
				100
			).toFixed(1) + "%";
	}

	// 7. Update DOM
	document.getElementById("totalRequests").textContent = totalRequests;
	document.getElementById("approvedRequests").textContent = approvedRequests;
	document.getElementById(
		"totalDisbursed"
	).textContent = `₱${totalDisbursedCompleted.toLocaleString()}`;
	const monthlyChangeElement = document.getElementById("monthlyChange");
	monthlyChangeElement.innerHTML = `
		<span style="font-size:2rem;font-weight:bold;">${monthlyChange}</span><br/>
		<span style="font-size:1rem;color:#6b7280;opacity:0.7;">Prev Month: <b>${prevMonthlyChange}</b></span>
	`;
	monthlyChangeElement.className = `text-2xl font-semibold ${
		monthlyChange === "N/A"
			? "text-gray-600"
			: parseFloat(monthlyChange) >= 0
			? "text-green-600"
			: "text-red-600"
	}`;
}

function updateCharts(monthRequests) {
	// Monthly Trend Chart
	const monthlyTrendCtx = document
		.getElementById("monthlyTrendChart")
		.getContext("2d");
	if (monthlyTrendChart) {
		monthlyTrendChart.destroy();
	}

	// Group requests by day, counting unique req_id per day
	const dailyData = {};
	monthRequests.forEach((req) => {
		const date = new Date(req.reqS_datetime).toLocaleDateString();
		if (!dailyData[date]) {
			dailyData[date] = {
				totalSet: new Set(),
				approvedSet: new Set(),
			};
		}
		dailyData[date].totalSet.add(req.req_id);
		if (req.statusR_name.toLowerCase() === "approved") {
			dailyData[date].approvedSet.add(req.req_id);
		}
	});

	const dates = Object.keys(dailyData).sort();
	const totalData = dates.map((date) => dailyData[date].totalSet.size);
	const approvedData = dates.map((date) => dailyData[date].approvedSet.size);

	monthlyTrendChart = new Chart(monthlyTrendCtx, {
		type: "line",
		data: {
			labels: dates,
			datasets: [
				{
					label: "Total Requests",
					data: totalData,
					borderColor: "#8B1C23",
					backgroundColor: "rgba(139, 28, 35, 0.1)",
					tension: 0.4,
				},
				{
					label: "Approved Requests",
					data: approvedData,
					borderColor: "#22C55E",
					backgroundColor: "rgba(34, 197, 94, 0.1)",
					tension: 0.4,
				},
			],
		},
		options: {
			responsive: true,
			plugins: {
				legend: {
					position: "top",
				},
			},
			scales: {
				y: {
					beginAtZero: true,
					ticks: {
						stepSize: 1,
					},
				},
			},
		},
	});

	// Modern Request Status Distribution Chart
	const statusDistributionCtx = document
		.getElementById("statusDistributionChart")
		.getContext("2d");
	if (statusDistributionChart) {
		statusDistributionChart.destroy();
	}

	const statusCounts = {};
	monthRequests.forEach((req) => {
		const status = req.statusR_name.toLowerCase();
		statusCounts[status] = (statusCounts[status] || 0) + 1;
	});

	statusDistributionChart = new Chart(statusDistributionCtx, {
		type: "doughnut",
		data: {
			labels: Object.keys(statusCounts).map(
				(status) => status.charAt(0).toUpperCase() + status.slice(1)
			),
			datasets: [
				{
					data: Object.values(statusCounts),
					backgroundColor: [
						"rgba(255, 193, 7, 0.85)", // Pending (modern yellow)
						"rgba(34, 197, 94, 0.85)", // Completed (modern green)
						"rgba(239, 68, 68, 0.85)", // Approved (modern red)
						"rgba(59, 130, 246, 0.85)", // Rejected/Other (modern blue)
					],
					borderRadius: 20, // Rounded edges
					borderWidth: 4,
					borderColor: "#fff",
					hoverOffset: 12,
				},
			],
		},
		options: {
			cutout: "75%", // Thinner ring
			plugins: {
				legend: {
					display: false, // Hide default legend
				},
				tooltip: {
					callbacks: {
						label: function (context) {
							const label = context.label || "";
							const value = context.parsed;
							const total = context.dataset.data.reduce((a, b) => a + b, 0);
							const percent = ((value / total) * 100).toFixed(1);
							return `${label}: ${value} (${percent}%)`;
						},
					},
				},
				datalabels: {
					color: "#222",
					font: { weight: "bold", size: 16 },
					formatter: (value, ctx) => {
						const total = ctx.chart.data.datasets[0].data.reduce(
							(a, b) => a + b,
							0
						);
						return total ? Math.round((value / total) * 100) + "%" : "";
					},
				},
			},
			animation: {
				animateRotate: true,
				duration: 1200,
			},
			layout: {
				padding: 20,
			},
		},
		plugins: [ChartDataLabels],
	});

	// Calculate total disbursed (completed) for all time
	const totalDisbursed = allRequests
		.filter(
			(req) =>
				req.statusR_name && req.statusR_name.toLowerCase() === "completed"
		)
		.reduce((sum, req) => sum + Number(req.req_budget || 0), 0);
	updateDisbursedVsBudgetedChart(totalDisbursed);
}

function updateDetailedTable(monthRequests) {
	const tableBody = document.getElementById("reportTableBody");
	tableBody.innerHTML = "";

	if (monthRequests.length === 0) {
		tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-4 text-center text-gray-500">
                    No requests found for the selected month
                </td>
            </tr>
        `;
		return;
	}

	monthRequests.forEach((req) => {
		const row = document.createElement("tr");
		row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                ${new Date(req.reqS_datetime).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                ${req.user_firstname} ${req.user_lastname}
            </td>
            <td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                ${req.req_purpose}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                ₱${Number(req.req_budget).toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
									req.statusR_name
								)}">
                    ${req.statusR_name}
                </span>
            </td>
        `;
		tableBody.appendChild(row);
	});
}

function getStatusColor(status) {
	switch (status.toLowerCase()) {
		case "pending":
			return "bg-yellow-100 text-yellow-800";
		case "approved":
			return "bg-green-100 text-green-800";
		case "rejected":
			return "bg-red-100 text-red-800";
		case "completed":
			return "bg-blue-100 text-blue-800";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

function updateDisbursedVsBudgetedChart(totalDisbursed) {
	axios
		.post(
			"http://localhost/cashAdvancedSystem/php/admin.php",
			new URLSearchParams({
				operation: "getTotalBudgeted",
			})
		)
		.then((response) => {
			const totalBudgeted = response.data.total_budgeted || 0;
			const remaining = Math.max(totalBudgeted - totalDisbursed, 0);

			console.log(
				"Total Budgeted:",
				totalBudgeted,
				"Total Disbursed:",
				totalDisbursed,
				"Remaining:",
				remaining
			);

			const canvas = document.getElementById("disbursedVsBudgetedChart");
			const ctx = canvas.getContext("2d");

			// Robust destroy: use Chart.getChart if available (Chart.js v3+)
			if (window.Chart && typeof window.Chart.getChart === "function") {
				const existingChart = window.Chart.getChart(canvas);
				if (existingChart) {
					existingChart.destroy();
				}
			} else if (
				window.disbursedVsBudgetedChart &&
				typeof window.disbursedVsBudgetedChart.destroy === "function"
			) {
				window.disbursedVsBudgetedChart.destroy();
			}

			window.disbursedVsBudgetedChart = new Chart(ctx, {
				type: "doughnut",
				data: {
					labels: ["Disbursed", "Remaining"],
					datasets: [
						{
							data: [totalDisbursed, remaining],
							backgroundColor: [
								"rgba(34, 197, 94, 0.85)", // Disbursed (green)
								"rgba(59, 130, 246, 0.85)", // Remaining (blue)
							],
							borderRadius: 20,
							borderWidth: 4,
							borderColor: "#fff",
							hoverOffset: 12,
						},
					],
				},
				options: {
					cutout: "75%",
					plugins: {
						legend: { display: true },
					},
				},
			});
		});
}
