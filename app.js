// ===== GEOCODING + ROUTING =====
console.log("JS LOADED");
function setupGeocoder(inputId, dropdownId, storeCallback) {
console.log("geocoder running:", inputId);

const input = document.getElementById(inputId);
const dropdown = document.getElementById(dropdownId);

let timer;
input.addEventListener("input", () => {
clearTimeout(timer);

const query = input.value.trim();
console.log("typing:", inputId, query);

if (query.length < 3) {
dropdown.style.display = "none";
return;
}

timer = setTimeout(async () => {
const url =
`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;

const res = await fetch(url);
const data = await res.json();

dropdown.innerHTML = "";

if (!data.length) {
dropdown.style.display = "none";
return;
}

data.forEach(place => {
const div = document.createElement("div");
div.className = "geocoder-item";
div.textContent = place.display_name;

div.onclick = () => {
input.value = place.display_name;
dropdown.style.display = "none";

storeCallback({
lat: parseFloat(place.lat),
lon: parseFloat(place.lon),
name: place.display_name
});
};

dropdown.appendChild(div);
});

dropdown.style.display = "block";
}, 400);
});

document.addEventListener("click", (e) => {
if (!input.contains(e.target) && !dropdown.contains(e.target)) {
dropdown.style.display = "none";
}
});
}
let pickupCoords = null;
let dropoffCoords = null;

async function geocode(location) {
const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
const data = await fetch(url).then(r => r.json());

if (!data[0]) return null;

return {
lat: parseFloat(data[0].lat),
lon: parseFloat(data[0].lon)
};
}

async function getDrivingDistance(start, end) {
const url =
`https://router.project-osrm.org/route/v1/driving/` +
`${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`;

const response = await fetch(url).then(r => r.json());

const meters = response.routes[0].distance;
return meters * 0.000621371;
}
// for get total if miles back where included it would increase the amount needed to be paid for
// so for the time being it just to and to the pickup

function getTotal(milesTo, milesBack, milesPickup) {
return milesTo + milesPickup;
}

// needs to recharge every 180 miles so while the loop runs 
// might not work for over 1000 miles due to height

function chargeCount(miles) {
const maxMiles=180
let count = miles/maxMiles
return count;
}
// changable charge rate makes it easier to plan for changes
// unless charges is 0 its just rate * the amount of charges

function costForCharge(charges) {
const rateForCharge = 50;
if (charges === 0) return 0;
return rateForCharge * charges;
}

// the estimatted cost per mile

function costPerMile(miles) {
return miles * 1.50;
}

// with no way to calculate a ever changing speed making a lower average makes it easier to calc

function timeOnTheRoad(miles) {
const averageSpeed = 65;
return miles / averageSpeed;
}

// typical charge time is 45 but may be prone to change over time
// taking the charges times the minutes gives the overall minutes
// then dividing by 60 gives the hours with minutes as a decimal

function chargeTime(charges) {
const chargeTimeEstimate = 45;

if (charges === 0) return 0;

return (charges * chargeTimeEstimate) / 60;
}
// the unload time is prone to change
// just takes in every time and adds

function totalTime(miles, charges) {
const loadUnload = 1;
const road = timeOnTheRoad(miles);
const chargingTime = chargeTime(charges);

return road + loadUnload + chargingTime;
}
// the cpotential cost for the driver
// takes the charges and hours in total along with the
// standard $ 1.5 per mile and if the hourly rate is there adds that

function driverCost(chargeCost, miles) {
  const charges = chargeCount(miles);
  const hours = totalTime(miles, charges);

  const mileCost = costPerMile(miles);

  return  (hours * 26) + 26;
}

function profitAmountNeeded(driver) {
const minProfit = 70;

const amountNeeded = driver + minProfit;
const profitAmount = amountNeeded - driver;

return { amountNeeded, profitAmount };
}
setupGeocoder("pickup", "pickupLocationDropdown", (data) => {
pickupCoords = data;
});

setupGeocoder("dropoff", "dropoffLocationDropdown", (data) => {
dropoffCoords = data;
});

// ===== MAIN FUNCTION =====

async function run() {
const driverLocation = document.getElementById("driver").value;

const driverCoords = await geocode(driverLocation);

if (!pickupCoords || !dropoffCoords || !driverCoords) {
alert("Please select all locations properly.");
return;
}

const milesPickup = await getDrivingDistance(
driverCoords,
pickupCoords
);

const milesTo = await getDrivingDistance(
pickupCoords,
dropoffCoords
);

const milesBack = await getDrivingDistance(
dropoffCoords,
driverCoords
);
  


const totalMiles = getTotal(milesTo, milesBack, milesPickup) + milesBack;
  
const noReturnMiles=totalMiles-milesBack;
const dollarRate=noReturnMiles*1;
const dollarHalfRate=noReturnMiles*1.5;
const twoDollarRate=noReturnMiles*2;
  
const charges = chargeCount(totalMiles);
const chargeCost = costForCharge(charges);

const rateElement = document.getElementById("hourlyRate");
const rate = rateElement ? rateElement.checked : false;
let driver=0
if (rate){ 
   driver = driverCost(chargeCost, noReturnMiles);
}
const totalCosts= chargeCost+driver
const result = profitAmountNeeded(totalCosts);
  
const driverLine = rate ? `Driver Costs: $${driver.toFixed(2)}\n` : "";




document.getElementById("output").textContent =
`Home → Pickup: ${milesPickup.toFixed(2)} miles
Pickup → Delivery: ${milesTo.toFixed(2)} miles
Delivery → Home: ${milesBack.toFixed(2)} miles
Total Miles: ${totalMiles.toFixed(2)} miles

Miles Without Return: ${noReturnMiles.toFixed(2)} miles
1 Dollar Per Mile: $${dollarRate.toFixed(2)}
1.5 Dollars Per Mile: $${dollarHalfRate.toFixed(2)}
2 Dollars Per Mile: $${twoDollarRate.toFixed(2)}

Charges : ${charges.toFixed(2)}
Charge Costs : $${chargeCost.toFixed(2)}
${driverLine}

Total Costs: $${totalCosts.toFixed(2)}

Minimum: $${result.amountNeeded.toFixed(2)}`;
}
