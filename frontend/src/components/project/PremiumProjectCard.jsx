import React from 'react';
import { motion } from 'framer-motion';
import { fadeUpCard } from '../../utils/animations';
import './PremiumProjectCard.css';

const PremiumProjectCard = ({ project, onClick }) => {
  return (
    <motion.div
      variants={fadeUpCard}
      className="premium-project-card"
      onClick={() => onClick(project.id)}
    >
      <div className="premium-project-card-icon">
        {project.code ? project.code.charAt(0) : 'P'}
      </div>
      <h3 className="premium-project-card-title">
        {project.name}
      </h3>
      <p className="premium-project-card-code">
        Code: {project.code}
      </p>
      {project.submodules && project.submodules.length > 0 && (
        <p className="premium-project-card-submodules">
          Submodules: {project.submodules.length}
        </p>
      )}
      {project.dashboardConfig && (
        <div className="premium-project-card-badge-container">
          <span className="premium-project-card-badge">
            Dashboard Configured
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default PremiumProjectCard;
