import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./Register";
import Login from "./Login";
import Home from "./Home";
import About from "./About";
import Profile from "./Profile";
import SecurityPage from "./SecurityPage";
import ContactUs from "./ContactUs";
import CompleteProfile from "./CompleteProfile";
import PostDetail from "./PostDetail";
import Cover from "./Cover";
import ChangePassword from "./ChangePassword";
import PrivateRoute from "./PrivateRoute"; // Import the PrivateRoute component
import ForgotPassword from "./ForgotPassword";
import Cc from "./Cc";
import UsersTable from "./admin/UsersTable";
import AdminDashboard from "./admin/AdminDashboard";
import AdminRoute from "./AdminRoute";
import SecurityProducts from "./admin/SecurityProducts";
import AdminReg from "./admin/AdminRegister";
import FeedbackTable from "./admin/FeedbackTable";
import InquiryTable from "./admin/InquiryTable";
import ReportedPostsTable from "./admin/ReportedPosts";
import PostsTable from "./admin/PostsTable";
import PendingApproval from "./PendingApproval";
import NewUsersTable from "./admin/NewUsersTable";
function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Cover />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/post/:postId" element={<PostDetail />} /> 
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/cc" element={<Cc />} />
        
        {/* Public Post Page */}

        {/* Protected Routes */}
        <Route element={<PrivateRoute />}>
          {/* <Route path="/admin" element={<AdminDashboard />} /> */}
          <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
          
          <Route path="/admin/secproducts" element={<AdminRoute><SecurityProducts /></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><UsersTable /></AdminRoute>} />
          <Route path="/admin/feedback" element={<AdminRoute><FeedbackTable /></AdminRoute>} />
          <Route path="/admin/adminregister" element={<AdminRoute><AdminReg /></AdminRoute>} />
          <Route path="/admin/inquiry" element={<AdminRoute><InquiryTable /></AdminRoute>} />
          <Route path="/admin/reportedposts" element={<AdminRoute><ReportedPostsTable /></AdminRoute>} />
          <Route path="/admin/poststable" element={<AdminRoute><PostsTable /></AdminRoute>} />
          <Route path="/admin/newusers" element={<AdminRoute><NewUsersTable /></AdminRoute>} />
          

          <Route path="/home" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/security" element={<SecurityPage />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />
          <Route path="/change-password" element={<ChangePassword />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
