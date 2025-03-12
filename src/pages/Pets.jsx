import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";  // React Router 사용
import "./Pets.css";

const Pets = () => {
  const [pets, setPets] = useState([]);
  const navigate = useNavigate(); // 홈으로 돌아가기 함수

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

      {/* 홈으로 돌아가기 버튼 추가 */}
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
    x: Math.random() * 600 + 100, // 100 ~ 700 사이 랜덤 X 좌표
    y: Math.random() * 400 + 100, // 100 ~ 500 사이 랜덤 Y 좌표
  });

  const [position, setPosition] = useState(getRandomPosition());

  useEffect(() => {
    const movePet = () => {
      setPosition(getRandomPosition());
    };

    const interval = setInterval(movePet, Math.random() * 5000 + 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="pet-wrapper"
      initial={{ x: position.x, y: position.y }}
      animate={{ x: position.x, y: position.y }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <img className="pet-egg" src={src} alt="Pet" />
    </motion.div>
  );
};

export default Pets;
