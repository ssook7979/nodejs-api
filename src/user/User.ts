import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
} from 'sequelize';
import Token from '../auth/Token';
import sequelize from '../config/database';

class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: number | null;
  declare username: string;
  declare email: string;
  declare password: string | null;
  declare inactive: boolean | null;
  declare activationToken: string | null;
  declare passwordResetToken: string | null;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
    },
    inactive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    activationToken: {
      type: DataTypes.STRING,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
    },
  },
  { sequelize, modelName: 'user' }
);

User.hasMany(Token, {
  as: 'tokens',
  onDelete: 'CASCADE',
  hooks: true,
  foreignKey: 'userId',
  sourceKey: 'id',
});

export default User;
