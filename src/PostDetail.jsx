import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db, auth } from "./config/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { UilThumbsUp, UilThumbsDown, UilSick, UilShare } from "@iconscout/react-unicons";

const Navbar = ({ isLoggedIn, handleLogout }) => (
  <nav className="bg-blue-600 p-4 flex justify-between items-center text-white">
    <Link to="/" className="text-lg font-bold">My App</Link>
    {isLoggedIn ? (
      <button onClick={handleLogout} className="bg-red-500 px-4 py-2 rounded">Logout</button>
    ) : (
      <Link to="/login" className="bg-green-500 px-4 py-2 rounded">Login</Link>
    )}
  </nav>
);

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [user, setUser] = useState(null);
  const [posterInfo, setPosterInfo] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);
    });
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  useEffect(() => {
    const fetchPost = async () => {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
          const postData = postSnap.data();
          
          // Ensure correct fetching of upvoteCount, downvoteCount, and reportCount
          setPost({
            ...postData,
            upvoteCount: postData.upvoteCount ?? 0,
            downvoteCount: postData.downvoteCount ?? 0,
            reportCount: postData.reportCount ?? 0,
          });
      
          fetchUserInfo(postData.userId);
        } else {
          navigate("/");
        }
      };
      
      

    const fetchUserInfo = async (userId) => {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        setPosterInfo(userSnap.data());
      }
    };

    fetchPost();
  }, [postId, navigate]);

  const handleInteraction = async (type) => {
    if (!isLoggedIn) return;
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      [`${type}Users`]: arrayUnion(user.uid),
      [`${type}Count`]: (post?.[`${type}Count`] || 0) + 1,
    });
    setPost((prev) => ({ ...prev, [`${type}Count`]: (prev?.[`${type}Count`] || 0) + 1 }));
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/post/${postId}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Link copied to clipboard!");
  };

  if (!post) return <p>Loading...</p>;
  if (post.reportCount > 3) return <p>This post is unavailable due to reports.</p>;

  return (
    <div>
      <Navbar isLoggedIn={isLoggedIn} handleLogout={handleLogout} />
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center mb-4">
          {posterInfo && (
            <img src={posterInfo.profilePic} alt="Profile" className="w-12 h-12 rounded-full mr-3" />
          )}
          <div>
            <h2 className="text-lg font-bold">{posterInfo?.username || "Anonymous"}</h2>
          </div>
        </div>

        <p className="text-lg mb-4">{post.content}</p>
        {post.mediaUrl && <img src={post.mediaUrl} alt="Post" className="w-full rounded-lg" />}
        <p className="text-sm text-gray-600">Pin Code: {post.pincode}</p>

        <div className="flex justify-between items-center mt-4">
          <button className="flex items-center text-gray-600" disabled={!isLoggedIn} onClick={() => handleInteraction("upvote")}> 
            <UilThumbsUp size="24" className="mr-1" /> {post.upvoteCount || 0}
          </button>
          <button className="flex items-center text-gray-600" disabled={!isLoggedIn} onClick={() => handleInteraction("downvote")}> 
            <UilThumbsDown size="24" className="mr-1" /> {post.downvoteCount || 0}
          </button>
          <button className="flex items-center text-gray-600" disabled={!isLoggedIn} onClick={() => handleInteraction("report")}> 
            <UilSick size="24" className="mr-1" /> {post.reportCount || 0}
          </button>
          <button className="flex items-center text-gray-600" onClick={handleShare}> 
            <UilShare size="24" className="mr-1" /> Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostDetail;
