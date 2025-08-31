import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Users, MessageSquare, Flag, HelpCircle, MessageCircle, FileText, BarChart2, Menu } from 'lucide-react';
import { collection, getCountFromServer } from 'firebase/firestore';
import { db } from '../config/firebase'; // Adjust this import based on your firebase setup
import Sidebar from './Sidebar';
// import Layout from './Layout';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    posts: 0,
    comments: 0,
    upvotes: 0,
    downvotes: 0,
    reports: 0,
    inquiries: 0,
    feedback: 0
  });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Get counts from each collection
        const usersSnapshot = await getCountFromServer(collection(db, 'users'));
        const postsSnapshot = await getCountFromServer(collection(db, 'posts'));
        const commentsSnapshot = await getCountFromServer(collection(db, 'comments'));
        const upvotesSnapshot = await getCountFromServer(collection(db, 'upvotes'));
        const downvotesSnapshot = await getCountFromServer(collection(db, 'downvotes'));
        const reportsSnapshot = await getCountFromServer(collection(db, 'reports'));
        const inquiriesSnapshot = await getCountFromServer(collection(db, 'inquiries'));
        const feedbackSnapshot = await getCountFromServer(collection(db, 'feedback'));
        
        setStats({
          users: usersSnapshot.data().count,
          posts: postsSnapshot.data().count,
          comments: commentsSnapshot.data().count,
          upvotes: upvotesSnapshot.data().count,
          downvotes: downvotesSnapshot.data().count,
          reports: reportsSnapshot.data().count,
          inquiries: inquiriesSnapshot.data().count,
          feedback: feedbackSnapshot.data().count
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-green-50 overflow-hidden">
      {/* Sidebar Component with responsive toggle */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-700 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <Sidebar />
      </div>
      
      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidebarOpen ? 'md:ml-0' : ''}`}>
        <header className="bg-white border-b border-green-200 px-4 py-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center">
            <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-md text-green-600 hover:bg-green-50 focus:outline-none md:hidden"
            >
              <Menu size={24} />
            </button>
            <h1 className="ml-2 text-xl font-semibold text-green-800">Mangrove Guardian</h1>
          </div>
          <div className="text-sm text-green-600">
            Last updated: {new Date().toLocaleDateString()}
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-green-800">Dashboard Overview</h2>
            <p className="text-green-600">Welcome to the Mangrove Guardian Admin Panel</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-500 text-white rounded-lg p-4 shadow-md flex items-center">
              <div className="p-3 bg-white bg-opacity-30 rounded-full mr-4">
                <Users size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Total Users</h3>
                <p className="text-3xl font-bold">{stats.users}</p>
              </div>
            </div>
            
            <div className="bg-green-600 text-white rounded-lg p-4 shadow-md flex items-center">
              <div className="p-3 bg-white bg-opacity-30 rounded-full mr-4">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Total Posts</h3>
                <p className="text-3xl font-bold">{stats.posts}</p>
              </div>
            </div>
            
            <div className="bg-teal-500 text-white rounded-lg p-4 shadow-md flex items-center">
              <div className="p-3 bg-white bg-opacity-30 rounded-full mr-4">
                <BarChart2 size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium">Total Activity</h3>
                <p className="text-3xl font-bold">{stats.upvotes + stats.downvotes + stats.comments}</p>
              </div>
            </div>
          </div>

          {/* Statistics Section */}
          <div className="bg-white rounded-lg p-4 shadow-md mb-6 border border-green-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-green-800">Dashboard Statistics</h3>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-green-600">Loading statistics...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Users Tile */}
                <div className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-green-800">Total Users</h4>
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <Users className="text-emerald-600" size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.users}</p>
                  <p className="text-xs text-green-600 mt-1">Registered accounts</p>
                </div>

                {/* Posts Tile */}
                <div className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-green-800">Total Posts</h4>
                    <div className="bg-green-100 p-2 rounded-full">
                      <FileText className="text-green-600" size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.posts}</p>
                  <p className="text-xs text-green-600 mt-1">Published content</p>
                </div>

                {/* Comments Tile */}
                <div className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-green-800">Total Comments</h4>
                    <div className="bg-teal-100 p-2 rounded-full">
                      <MessageSquare className="text-teal-600" size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.comments}</p>
                  <p className="text-xs text-green-600 mt-1">Across all posts</p>
                </div>

                {/* Upvotes Tile */}
                <div className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-green-800">Total Upvotes</h4>
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <ArrowUp className="text-emerald-600" size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.upvotes}</p>
                  <p className="text-xs text-green-600 mt-1">Positive interactions</p>
                </div>

                {/* Downvotes Tile */}
                <div className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-green-800">Total Downvotes</h4>
                    <div className="bg-orange-100 p-2 rounded-full">
                      <ArrowDown className="text-orange-500" size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.downvotes}</p>
                  <p className="text-xs text-green-600 mt-1">Negative interactions</p>
                </div>

                {/* Reports Tile */}
                <div className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-green-800">Reported Posts</h4>
                    <div className="bg-red-100 p-2 rounded-full">
                      <Flag className="text-red-500" size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.reports}</p>
                  <p className="text-xs text-green-600 mt-1">Flagged content</p>
                </div>

                {/* Inquiries Tile */}
                <div className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-green-800">Total Inquiries</h4>
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <HelpCircle className="text-yellow-600" size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.inquiries}</p>
                  <p className="text-xs text-green-600 mt-1">User questions</p>
                </div>

                {/* Feedback Tile */}
                <div className="border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:bg-green-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-green-800">Total Feedback</h4>
                    <div className="bg-teal-100 p-2 rounded-full">
                      <MessageCircle className="text-teal-600" size={20} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{stats.feedback}</p>
                  <p className="text-xs text-green-600 mt-1">User suggestions</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;