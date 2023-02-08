import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  DataTypes,
  ForeignKey,
} from 'sequelize';
import sequelize from '../config/database';
import User from '../user/User';

class Token extends Model<
  InferAttributes<Token>,
  InferCreationAttributes<Token>
> {
  declare token: string;
  declare userId: ForeignKey<User['id']>;
  declare lastUsedAt: Date;
}

Token.init(
  {
    token: {
      type: DataTypes.STRING,
    },
    lastUsedAt: {
      type: DataTypes.DATE,
    },
  },
  { sequelize, modelName: 'token', timestamps: false }
);

export default Token;
