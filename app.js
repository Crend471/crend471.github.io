// ===== GEOCODING + ROUTING =====
function setupGeocoder(inputId, dropdownId, storeCallback) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  console.log("typing:", inputId, query);
  let timer;

  input.addEventListener("input", () => {
    clearTimeout(timer);

    const query = input.value.trim();

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

  // if (!startLoc || !endLoc) {
  //   throw new Error("Could not find one of the locations.");
  // }

  // const url =
  //   `https://router.project-osrm.org/route/v1/driving/` +
  //   `${startLoc.lon},${startLoc.lat};${endLoc.lon},${endLoc.lat}?overview=false`;

  // const response = await fetch(url).then(r => r.json());

  // const meters = response.routes[0].distance;
  // return meters * 0.000621371; // meters → miles


// ===== YOUR ORIGINAL LOGIC =====

function getTotal(milesTo, milesBack, milesPickup) {
  return milesTo + milesBack + milesPickup;
}

function chargeCount(miles) {
  let count = 0;
  for (let i = 180; i < 1000; i += 180) {
    if (miles > i) count++;
  }
  return count;
}

function costForCharge(charges) {
  const rateForCharge = 25;
  if (charges === 0) return 0;
  return rateForCharge * charges;
}

function costPerMile(miles) {
  return miles * 1.50;
}

function timeOnTheRoad(miles) {
  const averageSpeed = 65;
  return miles / averageSpeed;
}

function chargeTime(charges) {
  const chargeTimeEstimate = 45;

  if (charges === 0) return 0;

  return (charges * chargeTimeEstimate) / 60;
}

function totalTime(miles, charges) {
  const loadUnload = 2;
  const road = timeOnTheRoad(miles);
  const charge = chargeTime(charges);

  return road + loadUnload + charge;
}

function driverCost(chargeCost, miles) {
  const charges = chargeCount(miles);
  const hours = totalTime(miles, charges);

  const mileCost = costPerMile(miles);

  const rateElement = document.getElementById("hourlyRate");
  const rate = rateElement ? rateElement.checked : false;

  if (rate) {
    return chargeCost + (hours * 26) + 26;
  } else {
    return chargeCost + 26;
  }
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

  if (!pickupCoords || !dropoffCoords) {
    alert("Please select both pickup and dropoff locations from dropdown.");
    return;
  }

  const milesPickup = await getDrivingDistance(driverCoords, pickupCoords);
  const milesTo = await getDrivingDistance(pickupCoords, dropoffCoords);
  const milesBack = await getDrivingDistance(dropoffCoords, driverCoords);
  
  const totalMiles = getTotal(milesTo, milesBack, milesPickup);

  const charges = chargeCount(totalMiles);
  const chargeCost = costForCharge(charges);

  const driver = driverCost(chargeCost, totalMiles);

  const result = profitAmountNeeded(driver);

  document.getElementById("output").textContent =
`Home → Pickup: ${milesPickup.toFixed(2)} miles
Pickup → Delivery: ${milesTo.toFixed(2)} miles
Delivery → Home: ${milesBack.toFixed(2)} miles

TOTAL MILES: ${totalMiles.toFixed(2)}
CHARGES: ${charges}
CHARGE COST: $${chargeCost.toFixed(2)}

DRIVER COST: $${driver.toFixed(2)}
AMOUNT NEEDED: $${result.amountNeeded.toFixed(2)}`;

