import React from "react";
import Navbar from "./Navbar";

const About = () => {
  return (
    <div className="min-h-screen bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1518837695005-2083093ee35b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80')" }}>
      <Navbar />
      <div className="max-w-5xl mx-auto py-16 px-6">
        {/* Hero Section */}
        <div className="bg-white bg-opacity-95 shadow-xl rounded-lg overflow-hidden mb-12">
          <div className="p-8">
            <h1 className="text-4xl font-bold text-center mb-8 text-gray-800 border-b-2 border-green-700 pb-4">ABOUT MANGROVE GUARDIAN</h1>

            
            <div className="flex flex-col md:flex-row items-center mb-10">
              <div className="md:w-1/2 pr-0 md:pr-8 mb-6 md:mb-0">
                <img
                  src="https://images.stockcake.com/public/b/8/f/b8fd77ee-bbee-41a4-bab6-a112d5a34030_large/mangrove-aerial-view-stockcake.jpg"
                  alt="Mangrove Conservation System"
                  className="rounded-lg shadow-md w-full"
                />
              </div>
              <div className="md:w-1/2">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">Our Vision</h2>
                <p className="text-gray-700 mb-4 leading-relaxed">
                  At Mangrove Guardian, we are committed to protecting coastal mangrove ecosystems through community-powered conservation. Our platform empowers coastal communities to monitor and report threats to these vital natural barriers in real-time.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  We believe that community vigilance and participatory monitoring are powerful tools in mangrove conservation and biodiversity protection.
                </p>
              </div>
            </div>
            
            {/* Mission Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Our Mission</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-3 text-green-800">Community-Powered Monitoring</h3>
                  <p className="text-gray-700">
                    Our platform enables coastal communities, fishermen, and citizen scientists to report mangrove threats like illegal cutting, dumping, and land reclamation through geotagged reports.
                  </p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-3 text-green-800">AI-Assisted Validation</h3>
                  <p className="text-gray-700">
                    Our AI-powered system validates reports using satellite data and machine learning, ensuring that conservation authorities receive accurate and actionable information.
                  </p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-3 text-green-800">Gamified Conservation</h3>
                  <p className="text-gray-700">
                    We incentivize participation through points, leaderboards, and rewards, making mangrove conservation engaging and rewarding for active community members.
                  </p>
                </div>
              </div>
            </div>
            
            {/* How It Works */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">How It Works</h2>
              <div className="bg-gray-50 p-6 rounded-lg shadow-md">
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <span className="bg-green-700 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1">1</span>
                    <p className="text-gray-700"><span className="font-semibold">Report Incidents:</span> Users can quickly report mangrove threats like illegal cutting, pollution, or land encroachment with geotagged photos via mobile app or SMS.</p>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-700 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1">2</span>
                    <p className="text-gray-700"><span className="font-semibold">AI Validation:</span> Our system cross-references reports with satellite data and uses AI to validate incidents, ensuring accuracy before alerting authorities.</p>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-700 text-white rounded-full w-6 h-6 flex items-center justify-center mr-3 mt-1">3</span>
                    <p className="text-gray-700"><span className="font-semibold">Reward System:</span> Active reporters earn points, badges, and climb leaderboards, creating a gamified conservation experience that encourages sustained participation.</p>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Impact Section */}
            <div className="mb-10">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Conservation Impact</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-emerald-50 p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-3 text-emerald-800">🌿 Biodiversity Protection</h3>
                  <p className="text-gray-700">
                    Mangroves support 80% of global fish catches and provide critical habitat for countless species. Our monitoring helps preserve these biodiversity hotspots.
                  </p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-3 text-emerald-800">🌊 Storm Barrier Protection</h3>
                  <p className="text-gray-700">
                    By protecting mangroves, we maintain natural barriers that reduce storm surge by up to 70% and protect coastal communities from extreme weather events.
                  </p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-3 text-emerald-800">🌍 Carbon Storage</h3>
                  <p className="text-gray-700">
                    Mangroves store 3-4 times more carbon than terrestrial forests. Protecting them is crucial for climate change mitigation and carbon sequestration goals.
                  </p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold mb-3 text-emerald-800">👥 Community Empowerment</h3>
                  <p className="text-gray-700">
                    Our platform empowers local communities to become active guardians of their coastal ecosystems, creating sustainable conservation practices.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Company and College Logo Section
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Developed By</h3>
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 bg-white p-4 flex items-center justify-center rounded-lg shadow-md mb-4">
                    <img
                      src="https://od.lk/s/OV8yNDk0NjIxMzhf/aimbys.png"
                      alt="Aimbys Pvt. Ltd. Logo"
                      className="max-w-full max-h-full"
                    />
                  </div>
                  <h4 className="text-lg font-bold text-green-800">Aimbys Pvt. Ltd.</h4>
                  <p className="text-gray-700 mt-2">
                    Located in Ahmedabad - A trusted Environmental Technology (ET) brand, partnering with conservation
                    organizations and research institutions. A company that believes in sustainable innovation
                    and specializes in delivering impactful environmental solutions.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 p-6 rounded-lg shadow-md text-center">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Academic Partner</h3>
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 bg-white p-4 flex items-center justify-center rounded-lg shadow-md mb-4">
                    <img
                      src="https://od.lk/s/OV8yNDk0NjIxNDBf/ks.png"
                      alt="K.S. School of Business Management & Information Technology Logo"
                      className="max-w-full max-h-full"
                    />
                  </div>
                  <h4 className="text-lg font-bold text-green-800">K.S. School of Business Management & Information Technology</h4>
                  <p className="text-gray-700 mt-2">
                    An esteemed academic institution partnering in the development of this mangrove conservation initiative as part of their commitment to environmental research and sustainable technology.
                  </p>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;