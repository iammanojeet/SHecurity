import { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import policeStations from "./policeStations.json";
import { ArrowUpRight } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/484/484167.png",
  iconSize: [32, 32],
});

const stationIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/252/252025.png",
  iconSize: [32, 32],
});

function App() {
  const notify = () => toast("Please enter Emergency Number and Email");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [displayPolice, setDisplayPolice] = useState("mt-8 w-80 mb-8 hidden");
  const [userLocation, setUserLocation] = useState(null);
  const [nearestStations, setNearestStations] = useState([]);
  const [emailPhone, setEmailPhone] = useState(true);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    interimTranscript, // Added to check partial results
  } = useSpeechRecognition();

  // Start speech recognition on mount with continuous listening
  useEffect(() => {
    if (!browserSupportsSpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    const startListening = () => {
      console.log("Starting speech recognition...");
      SpeechRecognition.startListening({
        continuous: true,
        language: "en-US",
        interimResults: true, // Show partial results for debugging
      });
    };

    startListening();

    return () => {
      console.log("Stopping speech recognition on unmount...");
      SpeechRecognition.stopListening();
    };
  }, [browserSupportsSpeechRecognition]);

  // Handle emergency phrases with debugging
  useEffect(() => {
    console.log("Current transcript:", transcript);
    console.log("Interim transcript:", interimTranscript); // Log partial results
    const lowerTranscript = transcript.toLowerCase().trim();
    if (
      lowerTranscript.includes("help") ||
      lowerTranscript.includes("emergency") ||
      lowerTranscript.includes("police")
    ) {
      console.log(
        "Emergency detected! Here is the Transcript:",
        lowerTranscript
      );
      handleHelp();
      resetTranscript();
    }
  }, [transcript, interimTranscript, resetTranscript]);

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const toRad = (angle) => (angle * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchUserLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ latitude, longitude });

          const sortedStations = policeStations
            .map((station) => ({
              ...station,
              distance: getDistance(
                latitude,
                longitude,
                station.latitude,
                station.longitude
              ),
            }))
            .sort((a, b) => a.distance - b.distance);

          setNearestStations(sortedStations.slice(0, 2));
        },
        (error) => {
          alert("Error fetching location: " + error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const setItemWithExpiry = (key, value, hours) => {
    const expiry = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem(key, JSON.stringify({ value, expiry }));
  };

  const getItemWithExpiry = (key) => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;

    const { value, expiry } = JSON.parse(itemStr);
    if (Date.now() > expiry) {
      localStorage.removeItem(key);
      return null;
    }
    return value;
  };

  useEffect(() => {
    const storedEmail = getItemWithExpiry("Email");
    const storedPhone = getItemWithExpiry("Phone");

    if (storedEmail && storedPhone) {
      setEmail(storedEmail);
      setPhone(storedPhone);
      setEmailPhone(false);
    } else {
      setEmailPhone(true);
    }

    fetchUserLocation();
  }, []);

  const resetHandle = () => {
    localStorage.clear();
    setEmailPhone(true);
    setEmail("");
    setPhone("");
    setDisplayPolice("mt-8 w-80 mb-8 hidden");
  };

  const handleHelp = () => {
    console.log("handleHelp called");
    if (!email || !phone) {
      notify();
      return;
    }

    setItemWithExpiry("Email", email, 96);
    setItemWithExpiry("Phone", phone, 96);

    setDisplayPolice("mt-8 w-80 mb-8");

    if (!userLocation) {
      alert("Fetching your location...");
      return;
    }

    const API_URL =
      window.location.hostname === "localhost"
        ? "http://localhost:5000/send-alert"
        : "https://shecurity-v1.onrender.com/send-alert";

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, ...userLocation }),
    })
      .then((res) => res.json())
      .then((data) => alert(data.message))
      .catch((err) => alert("Error sending alert: " + err.message));
  };

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({
        continuous: true,
        language: "en-US",
        interimResults: true,
      });
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="min-h-screen flex flex-col items-center bg-white">
        <div className="w-full bg-red-600 text-white flex justify-center items-center p-4">
          <h1 className="text-3xl font-bold flex items-center justify-center text-center">
            SHEcurity
          </h1>
        </div>

        <div className="flex flex-col items-center mt-10">
          <button
            onClick={handleHelp}
            className="bg-red-600 text-white text-2xl font-bold h-40 w-40 rounded-full shadow-2xl shadow-black cursor-pointer"
          >
            HELP
          </button>

          {/* Microphone Toggle Button */}
          <button
            onClick={toggleListening}
            className={`mt-10 text-2xl font-bold h-10 w-10 rounded-full shadow-xl shadow-black cursor-pointer flex items-center justify-center ${
              listening ? "bg-green-600" : "bg-red-600"
            } text-white`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          </button>

          {/* Debug Output */}
          <div className="mt-4 text-center">
            <p>Mic: {listening ? "On" : "Off"}</p>
            <p>
              Transcript: {transcript || "Say 'help', 'emergency', or 'police'"}
            </p>
            <p>
              Interim Transcript:{" "}
              {interimTranscript || "No partial results yet"}
            </p>
          </div>

          <button
            onClick={resetHandle}
            className="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-3 py-2.5 me-2 my-5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
          >
            Reset Contact
          </button>

          {emailPhone && (
            <div className="mt-6 w-80">
              <input
                type="text"
                placeholder="Enter emergency phone number"
                className="w-full p-3 mt-4 bg-gray-800 text-white rounded-md focus:outline-none"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                type="email"
                placeholder="Enter emergency email"
                className="w-full p-3 mt-4 bg-gray-800 text-white rounded-md focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}
        </div>

        {userLocation && nearestStations.length > 0 && (
          <div className={displayPolice}>
            <h2 className="text-lg font-bold mb-3 text-center">
              Nearest Police Stations
            </h2>
            <MapContainer
              center={[userLocation.latitude, userLocation.longitude]}
              zoom={14}
              style={{ height: "100px", width: "100%" }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker
                position={[userLocation.latitude, userLocation.longitude]}
                icon={userIcon}
              >
                <Popup>You are here</Popup>
              </Marker>
              {nearestStations.map((station, index) => (
                <Marker
                  key={index}
                  position={[station.latitude, station.longitude]}
                  icon={stationIcon}
                >
                  <Popup>{station.name}</Popup>
                </Marker>
              ))}
            </MapContainer>

            {nearestStations.map((station, index) => (
              <div
                key={index}
                className="p-3 bg-gray-100 shadow flex justify-between"
              >
                <div>
                  <h2 className="textLg font-semibold">{station.name}</h2>
                  <p>📍 Distance: {station.distance.toFixed(2)} km</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${station.latitude},${station.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 w-15 h-15 text-white px-4 mt-2 rounded-full text-center flex place-items-center"
                >
                  <ArrowUpRight size={45} />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
