
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const statusMessage = document.getElementById("status");
const weatherContent = document.getElementById("weatherContent");

const weatherDescriptions = {
    0: ["Clear Sky", "☀️"],
    1: ["Mainly Clear", "🌤️"],
    2: ["Partly Cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Foggy", "🌫️"],
    48: ["Rime Fog", "🌫️"],
    51: ["Light Drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Heavy Drizzle", "🌧️"],
    56: ["Freezing Drizzle", "🌧️"],
    57: ["Freezing Drizzle", "🌧️"],
    61: ["Light Rain", "🌦️"],
    63: ["Moderate Rain", "🌧️"],
    65: ["Heavy Rain", "🌧️"],
    66: ["Freezing Rain", "🌧️"],
    67: ["Heavy Freezing Rain", "🌧️"],
    71: ["Light Snow", "🌨️"],
    73: ["Snow", "❄️"],
    75: ["Heavy Snow", "🌨️"],
    77: ["Snow Grains", "❄️"],
    80: ["Rain Showers", "🌦️"],
    81: ["Rain Showers", "🌧️"],
    82: ["Heavy Showers", "⛈️"],
    85: ["Snow Showers", "🌨️"],
    86: ["Heavy Snow Showers", "🌨️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with Hail", "⛈️"],
    99: ["Severe Thunderstorm", "⛈️"]
};

function getWeather(code) {
    return weatherDescriptions[code] || ["Unknown Conditions", "🌡️"];
}

function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.classList.toggle("error", isError);
}

async function getJSON(url) {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Unable to fetch weather data. Please try again.");
    }

    return response.json();
}

async function searchCity(city) {
    const url =
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;

    const data = await getJSON(url);

    if (!data.results || data.results.length === 0) {
        throw new Error("City not found. Please check the spelling.");
    }

    return data.results[0];
}

async function getWeatherData(place) {
    const params = new URLSearchParams({
        latitude: place.latitude,
        longitude: place.longitude,
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "weather_code",
            "wind_speed_10m"
        ].join(","),
        hourly: "visibility",
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "uv_index_max"
        ].join(","),
        timezone: "auto",
        forecast_days: "7"
    });

    return getJSON(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`
    );
}

function displayWeather(place, data) {
    const current = data.current;
    const daily = data.daily;
    const [description, icon] = getWeather(current.weather_code);

    document.getElementById("location").textContent =
        [place.name, place.admin1, place.country]
            .filter(Boolean)
            .join(", ");

    document.getElementById("currentDate").textContent =
        new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });

    document.getElementById("temperature").textContent =
        `${Math.round(current.temperature_2m)}°`;

    document.getElementById("weatherIcon").textContent = icon;
    document.getElementById("bigIcon").textContent = icon;

    document.getElementById("condition").textContent = description;

    document.getElementById("feelsLike").textContent =
        `${Math.round(current.apparent_temperature)}°C`;

    document.getElementById("humidity").textContent =
        `${current.relative_humidity_2m}%`;

    document.getElementById("wind").textContent =
        `${Math.round(current.wind_speed_10m)} km/h`;

    const currentHour = current.time.slice(0, 13);
    const visibilityIndex = data.hourly.time.findIndex(
        time => time.slice(0, 13) === currentHour
    );

    const visibility = visibilityIndex >= 0
        ? data.hourly.visibility[visibilityIndex]
        : null;

    document.getElementById("visibility").textContent =
        visibility != null
            ? `${(visibility / 1000).toFixed(1)} km`
            : "N/A";

    const todayUV = daily.uv_index_max[0];

    document.getElementById("uv").textContent =
        todayUV != null ? todayUV.toFixed(1) : "N/A";

    document.getElementById("summaryText").textContent =
        current.is_day ? "Have a lovely day!" : "Have a peaceful night!";

    renderForecast(daily);

    weatherContent.classList.remove("hidden");
}

function renderForecast(daily) {
    const forecastContainer = document.getElementById("forecast");
    forecastContainer.innerHTML = "";

    daily.time.forEach((date, index) => {
        const [description, icon] = getWeather(daily.weather_code[index]);

        const dayName = index === 0
            ? "Today"
            : new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                weekday: "short"
            });

        const card = document.createElement("article");
        card.className = "forecast-card";

        const day = document.createElement("p");
        day.className = "forecast-day";
        day.textContent = dayName;

        const weatherIcon = document.createElement("span");
        weatherIcon.className = "forecast-icon";
        weatherIcon.textContent = icon;

        const condition = document.createElement("p");
        condition.className = "forecast-condition";
        condition.textContent = description;

        const temperatures = document.createElement("div");
        temperatures.className = "forecast-temps";

        const high = document.createElement("span");
        high.textContent = `${Math.round(daily.temperature_2m_max[index])}°`;

        const low = document.createElement("span");
        low.className = "low";
        low.textContent = `${Math.round(daily.temperature_2m_min[index])}°`;

        temperatures.append(high, low);
        card.append(day, weatherIcon, condition, temperatures);
        forecastContainer.appendChild(card);
    });
}

searchForm.addEventListener("submit", async event => {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        showStatus("Please enter a city name.", true);
        return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = "Loading...";
    showStatus("Fetching live weather data...");
    weatherContent.classList.add("hidden");

    try {
        const place = await searchCity(city);
        const weatherData = await getWeatherData(place);

        displayWeather(place, weatherData);
        showStatus(`Weather loaded for ${place.name}.`);
    } catch (error) {
        showStatus(
            error.message || "Something went wrong. Please try again.",
            true
        );
    } finally {
        searchBtn.disabled = false;
        searchBtn.textContent = "Search";
    }
});
