/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Home from './pages/Home';
import Browse from './pages/Browse';
import ListingDetail from './pages/ListingDetail';
import PostAd from './pages/PostAd';
import Messages from './pages/Messages';
import MyAds from './pages/MyAds';
import SavedListings from './pages/SavedListings';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import UserProfile from './pages/UserProfile';
import EditAd from './pages/EditAd';
import Advertise from './pages/Advertise';
import MyPromotions from './pages/MyPromotions';
import PostEvent from './pages/PostEvent';
import MyEvents from './pages/MyEvents';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Browse": Browse,
    "ListingDetail": ListingDetail,
    "PostAd": PostAd,
    "EditAd": EditAd,
    "Advertise": Advertise,
    "MyPromotions": MyPromotions,
    "PostEvent": PostEvent,
    "MyEvents": MyEvents,
    "Messages": Messages,
    "MyAds": MyAds,
    "SavedListings": SavedListings,
    "AdminDashboard": AdminDashboard,
    "Login": Login,
    "Signup": Signup,
    "UserProfile": UserProfile,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};