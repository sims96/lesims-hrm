/**
 * mobile-menu.js
 * Enhanced mobile menu handling for Le Sims application
 */

document.addEventListener('DOMContentLoaded', function() {
    // Create overlay element if it doesn't exist
    if (!document.querySelector('.mobile-overlay')) {
      const overlay = document.createElement('div');
      overlay.className = 'mobile-overlay';
      document.body.appendChild(overlay);
    }
  
    // Get required elements
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const mobileOverlay = document.querySelector('.mobile-overlay');
    
    // Function to open sidebar
    function openSidebar() {
      sidebar.classList.add('active');
      document.body.classList.add('sidebar-active');
      // Add listener to detect clicks outside the sidebar
      setTimeout(() => { // Small timeout to prevent immediate closure
        document.addEventListener('click', handleOutsideClick);
      }, 10);
    }
    
    // Function to close sidebar
    function closeSidebar() {
      sidebar.classList.remove('active');
      document.body.classList.remove('sidebar-active');
      document.removeEventListener('click', handleOutsideClick);
    }
    
    // Handle clicks outside the sidebar
    function handleOutsideClick(event) {
      // If click is outside the sidebar, close it
      if (sidebar.classList.contains('active') && 
          !sidebar.contains(event.target) && 
          event.target !== sidebarToggle &&
          !sidebarToggle.contains(event.target)) {
        closeSidebar();
      }
    }
    
    // Toggle sidebar when the menu button is clicked
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent click from propagating to document
        if (sidebar.classList.contains('active')) {
          closeSidebar();
        } else {
          openSidebar();
        }
      });
    }
    
    // Close sidebar when overlay is clicked
    if (mobileOverlay) {
      mobileOverlay.addEventListener('click', function() {
        closeSidebar();
      });
    }
    
    // Close sidebar when a menu item is clicked
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => {
      item.addEventListener('click', function() {
        if (window.innerWidth <= 992) { // Only on mobile
          closeSidebar();
        }
      });
    });
    
    // Handle table scrolling indicators
    const tableContainers = document.querySelectorAll('.table-responsive');
    tableContainers.forEach(container => {
      container.addEventListener('scroll', function() {
        if (this.scrollWidth > this.clientWidth) {
          this.classList.add('scrollable');
          if (this.scrollLeft + this.clientWidth >= this.scrollWidth - 10) {
            this.classList.remove('scrollable');
          }
        }
      });
      
      // Check initially
      if (container.scrollWidth > container.clientWidth) {
        container.classList.add('scrollable');
      }
    });
    
    // Fix for iOS Safari 100vh issue
    function fixIOSViewHeight() {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    window.addEventListener('resize', fixIOSViewHeight);
    fixIOSViewHeight();
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
      // Recalculate view height
      setTimeout(fixIOSViewHeight, 100); // Small delay to allow browser to complete orientation
      
      // Check if we need to close the sidebar
      if (window.innerWidth > 992 && sidebar.classList.contains('active')) {
        closeSidebar();
      }
    });
  });