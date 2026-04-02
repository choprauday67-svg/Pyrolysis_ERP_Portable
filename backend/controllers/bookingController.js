const Booking = require('../models/bookingModel');
const Rates = require('../models/ratesModel');

exports.createBooking = async (req, res) => {
    try {
        const { product_type, quantity } = req.body;
        const rate = await Rates.getRate(product_type);
        
        if (!rate) {
            return res.status(400).json({ message: "Invalid product type for booking" });
        }

        const totalPrice = parseFloat(rate) * parseFloat(quantity);
        const bookingId = await Booking.create({
            user_id: req.user.id,
            product_type,
            quantity,
            total_price: totalPrice,
            date: new Date()
        });

        res.status(201).json({ 
            message: "Booking submitted for processing", 
            bookingId,
            totalPrice 
        });
    } catch (err) {
        console.error("Booking error:", err);
        res.status(500).json({ message: "System error during booking execution" });
    }
};

exports.getCustomerBookings = async (req, res) => {
    try {
        const bookings = await Booking.getByUser(req.user.id);
        res.json({ data: bookings });
    } catch (err) {
        res.status(500).json({ message: "Internal Error" });
    }
};

exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.getAll();
    res.json({ data: bookings });
  } catch (err) {
    res.status(500).json({ message: "Internal Error" });
  }
};

exports.updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await Booking.updateStatus(id, status);
        res.json({ message: "Status updated successfully" });
    } catch (err) {
        res.status(500).json({ message: "Update failed" });
    }
};
