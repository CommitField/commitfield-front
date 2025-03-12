import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./Pets.css";

const Pets = () => {
  const [pets, setPets] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/pets/getall")
      .then((res) => res.json())
      .then((data) => setPets(data));
  }, []);

  return (
    <div className="pets-wrapper">
      <div className="pets-container">
        {pets.map((pet, index) => (
          <Pet key={index} src={`/pets/${pet.grow}_${pet.type}_128.png`} />
        ))}
      </div>

      <div className="home-button-container">
        <button className="home-button" onClick={() => navigate("/home")}>
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
};

const Pet = ({ src }) => {
  const getRandomPosition = () => ({
    x: Math.random() * 600 + 100,
    y: Math.random() * 400 + 100,
  });

  const [position, setPosition] = useState(getRandomPosition());
  const [showHeart, setShowHeart] = useState(false);

  useEffect(() => {
    const movePet = () => {
      setPosition(getRandomPosition());
    };

    const interval = setInterval(movePet, Math.random() * 5000 + 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePetClick = () => {
    setShowHeart(true);
    setTimeout(() => setShowHeart(false), 1000); // 1초 후 사라지게 설정
  };

  return (
    <motion.div
      className="pet-wrapper"
      initial={{ x: position.x, y: position.y }}
      animate={{ x: position.x, y: position.y }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
      onClick={handlePetClick}
    >
      <img className="pet-egg" src={src} alt="Pet" />

      {/* ❤️ 하트 애니메이션 */}
      {showHeart && (
        <motion.div
          className="heart"
          initial={{ opacity: 1, y: -60 }}
          animate={{ opacity: 0, y: -120 }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          ❤️
        </motion.div>
      )}
    </motion.div>
  );
};

export default Pets;
