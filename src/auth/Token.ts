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
}

Token.init(
  {
    token: {
      type: DataTypes.STRING,
    },
  },
  { sequelize, modelName: 'token' }
);

export default Token;
