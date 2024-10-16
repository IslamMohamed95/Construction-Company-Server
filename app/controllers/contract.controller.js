const contractModel = require("../models/contract.model");
const masterModel = require("../models/master.model");
const userModel = require("../models/user.model");
const salesModel = require("../models/sales.model");

class contract {
  static new = async (req, res) => {
    try {
      let pending = [];
      let completed = [];
      let canceled = [];
      let now = new Date().setHours(0, 0, 0, 0);
      let date = new Date(req.body.start_date);
      let endDate = new Date(req.body.end_date);
      let assign_date = new Date(req.body.assign_date);

      date =
        date.getFullYear() +
        "-" +
        ("0" + (date.getMonth() + 1)) +
        "-" +
        ("0" + date.getDay());
      endDate =
        endDate.getFullYear() +
        "-" +
        ("0" + (endDate.getMonth() + 1)) +
        "-" +
        ("0" + endDate.getDay());

      assign_date =
        assign_date.getFullYear() +
        "-" +
        ("0" + (assign_date.getMonth() + 1)) +
        "-" +
        ("0" + assign_date.getDay());
      const user = await userModel.find({ code: req.params.code });
      const contract = new contractModel({
        user_code: req.params.code,
        owner: user[0].name,
        ...req.body,
      });

      contract.history.push({
        created_date: now,
        assign_date: assign_date,
        start_date: date,
        end_date: endDate,
        stage: req.body.stage,
        status: req.body.status,
        note: req.body.note === "" ? null : req.body.note,
      });

      await contract.save();
      let masters = await masterModel.find();
      let salesmen = await salesModel.find();
      let contract_num = await contractModel.find();

      salesmen.map(async (s) => {
        if (s.name === req.body.sale_executive) {
          let newData;
          date = new Date(req.body.start_date);
          date = date.toLocaleString("en-US", {
            month: "short",
          });
          s.annual_achieving += req.body.total_cost;
          for (let i = 0; i <= s.history.length; i++) {
            if (i < s.history.length && s.history[i].month == date) {
              s.history[i].achieved += req.body.total_cost;
              break;
            } else {
              if (i === s.history.length) {
                newData = {
                  month: date,
                  achieved: req.body.total_cost,
                };
                s.history.push(newData);
                break;
              }
            }
          }
          s.save();
        }
      });

      masters.forEach((m) => {
        contract_num.forEach((c) => {
          if (
            c.history.slice(-1)[0].status === "pending" ||
            c.history.slice(-1)[0].status === "completed" ||
            c.history.slice(-1)[0].status === "process 1" ||
            c.history.slice(-1)[0].status === "process 2"
          ) {
            pending.push(c);
          } else if (c.history.slice(-1)[0].status === "finished") {
            completed.push(c);
          } else if (c.history.slice(-1)[0].status === "canceled") {
            canceled.push(c);
          }

          m.pending_contracts = pending.length;
          m.completed_contracts = completed.length;
          m.canceled_contracts = canceled.length;
        });

        m.total_contracts = contract_num.length;
        m.save();
      });

      res.status(200).send({
        API: true,
        message: "Contract created successfully",
      });
    } catch (e) {
      res.status(500).send({
        API: false,
        message: e.message,
      });
    }
  };

  static contracts = async (req, res) => {
    try {
      const contracts = await contractModel.find();
      res.status(200).send({
        API: true,
        data: contracts,
      });
    } catch (e) {
      res.status(500).send({
        API: false,
        message: e.message,
      });
    }
  };

  static userContracts = async (req, res) => {
    try {
      const contracts = await contractModel.find({
        user_code: req.params.code,
      });
      res.status(200).send({
        API: true,
        contracts: contracts,
      });
    } catch (e) {
      res.status(500).send({
        API: false,
        message: e.message,
      });
    }
  };

  static delete = async (req, res) => {
    try {
      const contract = await contractModel.findById(req.params.id);
      await contractModel.findOneAndDelete({
        _id: req.params.id,
      });
      let masters = await masterModel.find();
      let contract_num = await contractModel.find();
      masters.forEach((m) => {
        if (
          contract.history.slice(-1)[0].status === "pending" ||
          contract.history.slice(-1)[0].status === "completed" ||
          contract.history.slice(-1)[0].status === "process 1" ||
          contract.history.slice(-1)[0].status === "process 2"
        ) {
          m.pending_contracts -= 1;
        } else if (contract.history.slice(-1)[0].status === "finished") {
          m.completed_contracts -= 1;
        } else if (contract.history.slice(-1)[0].status === "canceled") {
          m.canceled_contracts -= 1;
        }

        m.total_contracts = contract_num.length;
        m.save();
      });
      res.status(200).send({
        API: true,
        contracts: contract_num,
      });
    } catch (e) {
      res.status(500).send({
        API: false,
        message: e.message,
      });
    }
  };

  static edit = async (req, res) => {
    try {
      let now = new Date().setHours(0, 0, 0, 0);
      let pending = [];
      let completed = [];
      let canceled = [];
      await contractModel.findByIdAndUpdate(req.params.id, {
        ...req.body,
        $push: {
          history: {
            created_date: now,
            ...req.body,
          },
        },
      });
      const contract = await contractModel.findById(req.params.id);
      const contracts = await contractModel.find();
      const masters = await masterModel.find();
      masters.forEach((m) => {
        contracts.forEach((c) => {
          if (
            c.history.slice(-1)[0].status === "pending" ||
            c.history.slice(-1)[0].status === "completed" ||
            c.history.slice(-1)[0].status === "process 1" ||
            c.history.slice(-1)[0].status === "process 2"
          ) {
            pending.push(c);
          } else if (c.history.slice(-1)[0].status === "finished") {
            completed.push(c);
          } else if (c.history.slice(-1)[0].status === "canceled") {
            canceled.push(c);
          }
          m.pending_contracts = pending.length;
          m.completed_contracts = completed.length;
          m.canceled_contracts = canceled.length;
        });
        m.save();
      });

      if (req.body.note === "") {
        contract.history.slice(-1)[0].note = null;
      }

      contract.history.map((h) => {
        if (h.note !== null) {
          contract.checkNote = true;
        }
      });

      contract.save();

      res.status(200).send({
        API: true,
        contracts: contracts,
      });
    } catch (e) {
      res.status(500).send({
        API: false,
        message: e.message,
      });
    }
  };

  static sendContract = async (req, res) => {
    try {
      const contract = await contractModel.findById(req.params.id);
      res.status(200).send({
        API: true,
        data: contract,
      });
    } catch (e) {
      res.status(500).send({
        API: false,
        message: e.message,
      });
    }
  };

  static seen = async (req, res) => {
    try {
      const note = await contractModel.findById(req.params.id);
      note.history.slice(-1)[0].seen = true;
      await note.save();
      res.status(200).send({
        API: true,
      });
    } catch (e) {
      res.status(500).send({
        API: false,
        message: e.message,
      });
    }
  };

  static clientNotes = async (req, res) => {
    try {
      const client = await contractModel.findById(req.params.id);

      res.status(200).send({
        API: true,
        data: client,
      });
    } catch (e) {
      res.status(500).send({
        API: false,
        message: e.message,
      });
    }
  };
}

module.exports = contract;
