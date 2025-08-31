import React, { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../config/firebase";

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      setLoading(true);
      const usersRef = collection(db, "users");
      const q = query(usersRef, orderBy("points", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setLeaders(users);
      setLoading(false);
    };
    fetchLeaders();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
      <h2 className="text-2xl font-bold text-green-800 mb-4">Leaderboard</h2>
      {loading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : (
        <ol className="space-y-2">
          {leaders.map((user, idx) => (
            <li key={user.id} className="flex items-center justify-between p-2 border-b last:border-b-0">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-green-700">#{idx + 1}</span>
                <span className="font-semibold">{user.username || user.name || "Anonymous"}</span>
                {user.badges && user.badges.length > 0 && (
                  <span className="ml-2 text-xs text-yellow-600">🏅 {user.badges[user.badges.length - 1]}</span>
                )}
              </div>
              <span className="text-green-600 font-bold">{user.points || 0} pts</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};

export default Leaderboard;
