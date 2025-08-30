// import React from 'react';
// import * as Unicons from '@iconscout/react-unicons';
// import * as UisIcons from '@iconscout/react-unicons-solid';
// import * as UimIcons from '@iconscout/react-unicons-monochrome';

// const icons = () => {
//   return (
//     <Unicons.UilReact />
//     <UisIcons.UisThumbsUp />  
//     <UisIcons.UisThumbsDown />
//   );
// };

// export default icons;

// const Icons = () => {
//   return (
//     <div style={{ display: 'flex', gap: '20px', fontSize: '40px' }}>
//       <Unicons.UilReact />           {/* Regular Unicon */}
//       <UisIcons.UisThumbsUp />  
//       <UisIcons.UisThumbsDown />
// {/*       <Uis.UisThumbsDown />{/* Solid Icon */} */}
//       <UimIcons.UimAirplay />        {/* Monochrome Icon */}
//     </div>
//   );
// };

// export default Icons;


// import React from 'react';
// import * as Unicons from '@iconscout/react-unicons';


import React from 'react';
import * as Unicons from '@iconscout/react-unicons';
import * as UisIcons from '@iconscout/react-unicons-solid';
import * as UimIcons from '@iconscout/react-unicons-monochrome';

const Icons = () => {
  // Get all icon names from each collection
  const regularIconNames = Object.keys(Unicons);
  const solidIconNames = Object.keys(UisIcons);
  const monochromeIconNames = Object.keys(UimIcons);
  
  return (
    <div className="icons-container">
      <h2>Regular Icons</h2>
      <div className="icon-grid">
        {regularIconNames.map((iconName, index) => {
          const IconComponent = Unicons[iconName];
          return (
            <div key={index} className="icon-item">
              <IconComponent size="32" />
              <p>{iconName}</p>
            </div>
          );
        })}
      </div>
      
      <h2>Solid Icons</h2>
      <div className="icon-grid">
        {solidIconNames.map((iconName, index) => {
          const IconComponent = UisIcons[iconName];
          return (
            <div key={index} className="icon-item">
              <IconComponent size="32" />
              <p>{iconName}</p>
            </div>
          );
        })}
      </div>
      
      <h2>Monochrome Icons</h2>
      <div className="icon-grid">
        {monochromeIconNames.map((iconName, index) => {
          const IconComponent = UimIcons[iconName];
          return (
            <div key={index} className="icon-item">
              <IconComponent size="32" />
              <p>{iconName}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Icons;
